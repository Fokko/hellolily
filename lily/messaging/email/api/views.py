import logging
from django.db.models import Q
from rest_framework import viewsets, mixins, status, filters
from rest_framework.decorators import detail_route, list_route
from rest_framework.filters import DjangoFilterBackend
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from lily.messaging.email.utils import get_email_parameter_api_dict
from lily.search.lily_search import LilySearch
from lily.users.models import LilyUser

from .serializers import (EmailLabelSerializer, EmailAccountSerializer, EmailMessageSerializer,
                          EmailTemplateSerializer, SharedEmailConfigSerializer, TemplateVariableSerializer)
from ..models.models import EmailLabel, EmailAccount, EmailMessage, EmailTemplate, SharedEmailConfig, \
    TemplateVariable
from ..tasks import (trash_email_message, delete_email_message, archive_email_message, toggle_read_email_message,
                     add_and_remove_labels_for_message)


logger = logging.getLogger(__name__)


class EmailLabelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EmailLabel.objects.all()
    serializer_class = EmailLabelSerializer

    # Set all filter backends that this viewset uses.
    filter_backends = (DjangoFilterBackend,)
    filter_fields = ('account__id', 'label_id')

    def get_queryset(self):
        return EmailLabel.objects.filter(account__tenant_id=self.request.user.tenant_id)


class SharedEmailConfigViewSet(viewsets.ModelViewSet):
    queryset = SharedEmailConfig.objects.all()
    serializer_class = SharedEmailConfigSerializer

    # Set all filter backends that this viewset uses.
    filter_backends = (DjangoFilterBackend,)
    filter_fields = {
        'email_account',
        'is_hidden',
    }

    def perform_create(self, serializer):
        email_account_id = self.request.data['email_account']
        try:
            shared_email_setting = self.get_queryset().get(email_account_id=email_account_id)
            shared_email_setting.is_hidden = 'is_hidden' in self.request.data
            shared_email_setting.save()
        except SharedEmailConfig.DoesNotExist:
            serializer.save(tenant_id=self.request.user.tenant_id, user=self.request.user)

    def perform_update(self, serializer):
        is_hidden = 'is_hidden' in self.request.data
        serializer.save(tenant_id=self.request.user.tenant_id, user=self.request.user, is_hidden=is_hidden)

    def get_queryset(self):
        return SharedEmailConfig.objects.filter(tenant_id=self.request.user.tenant_id,
                                                user=self.request.user)


class EmailAccountViewSet(mixins.DestroyModelMixin,
                          mixins.UpdateModelMixin,
                          viewsets.ReadOnlyModelViewSet):

    queryset = EmailLabel.objects.all()
    serializer_class = EmailAccountSerializer

    # Set all filter backends that this viewset uses.
    filter_backends = (DjangoFilterBackend,)
    filter_fields = (
        'owner',
        'shared_with_users__id',
        'public',
    )

    def get_queryset(self):
        return EmailAccount.objects.filter(is_deleted=False).distinct('id')

    def perform_destroy(self, instance):
        if instance.owner_id is self.request.user.id:
            instance.is_deleted = True
            instance.save()
        else:
            return Response(status=status.HTTP_403_FORBIDDEN)

    @list_route()
    def mine(self, request):
        email_account_list = EmailAccount.objects.filter(
            Q(owner=request.user) |
            Q(public=True) |
            Q(shared_with_users__id=request.user.pk)
        ).filter(is_deleted=False).distinct('id')

        # Hide when we do not want to follow an email_account.
        email_account_exclude_list = SharedEmailConfig.objects.filter(
            user=request.user,
            is_hidden=True
        ).values_list('email_account_id', flat=True)

        email_account_list = email_account_list.exclude(
            id__in=email_account_exclude_list
        )

        serializer = self.get_serializer(email_account_list, many=True)

        return Response(serializer.data)

    @detail_route(methods=['post'])
    def shared(self, request, pk):
        """
        shared action makes it possible for the owner of the emailaccount to POST user ids to share emailaccount with.

        Accepts POST dict with:
            {
                'shared_with_users': [<list of user ids as ints]
            }

        Returns:
            changed EmailAccount
        """
        account = EmailAccount.objects.get(id=pk, owner=request.user)
        account.shared_with_users.clear()
        account.public = False
        account.save()

        for user_id in request.data['shared_with_users']:
            user = LilyUser.objects.get(id=user_id, tenant=request.user.tenant)
            account.shared_with_users.add(user)

        serializer = self.get_serializer(account)

        return Response(serializer.data)


class EmailMessageViewSet(mixins.RetrieveModelMixin,
                          mixins.ListModelMixin,
                          mixins.UpdateModelMixin,
                          mixins.DestroyModelMixin,
                          GenericViewSet):

    queryset = EmailMessage.objects.all()
    serializer_class = EmailMessageSerializer

    def get_queryset(self):
        return EmailMessage.objects.filter(account__tenant=self.request.user.tenant)

    def perform_update(self, serializer):
        """
        Any modifications are passed through the manager and not directly on the db.

        For now, only the read status will be updated.
        """
        email = self.get_object()
        toggle_read_email_message.apply_async(args=(email.id, self.request.data['read']))

    def perform_destroy(self, instance):
        """
        Any modifications are passed through the manager and not directly on the db.

        Delete will happen async
        """
        delete_email_message.apply_async(args=(instance.id,))

    @detail_route(methods=['put'])
    def archive(self, request, pk=None):
        """
        Any modifications are passed through the manager and not directly on the db.

        Archive will happen async
        """
        email = self.get_object()
        # Make sure emails are removed instantly from the email list
        email.is_removed = True
        email.save()
        serializer = self.get_serializer(email, partial=True)
        archive_email_message.apply_async(args=(email.id,))
        return Response(serializer.data)

    @detail_route(methods=['put'])
    def trash(self, request, pk=None):
        """
        Any modifications are passed through the manager and not directly on the db.

        Trash will happen async
        """
        email = self.get_object()
        trashed = email.is_removed
        # Make sure emails are removed instantly from the email list
        email.is_removed = True
        email.save()
        serializer = self.get_serializer(email, partial=True)
        if trashed is False:
            trash_email_message.apply_async(args=(email.id,))
        return Response(serializer.data)

    @detail_route(methods=['put'])
    def move(self, request, pk=None):
        """
        Any modifications are passed through the manager and not directly on the db.

        Move will happen async
        """
        email = self.get_object()
        serializer = self.get_serializer(email, partial=True)
        add_and_remove_labels_for_message.delay(
            email.id,
            remove_labels=request.data['data'].get('remove_labels', []),
            add_labels=request.data['data'].get('add_labels', []),
        )
        return Response(serializer.data)

    @detail_route(methods=['get'])
    def history(self, request, pk):
        """
        Returns what happend to an email
        """
        email = self.get_object()

        account_email = email.account.email_address
        sent_from_account = (account_email == email.sender.email_address)

        search = LilySearch(
            request.user.tenant_id,
            model_type='email_emailmessage',
            sort='sent_date',
        )

        search.filter_query('thread_id:%s' % email.thread_id)
        history, facets, total, took = search.do_search([
            'message_id',
            'received_by_email',
            'received_by_cc_email',
            'sender_email',
            'sender_name',
            'sent_date',
        ])

        try:
            index = (key for key, item in enumerate(history) if item['message_id'] == email.message_id).next()
        except StopIteration:
            logger.exception('No history for message %s\nhistory:\n%s' % (email.id, history))
            results = {
                'history_size': 0,
            }
            return Response(results)

        messages_after = history[index + 1:]

        results = {
            'history': history,
            'history_size': total,
        }
        if messages_after:
            if sent_from_account:
                next_messages = [item for item in messages_after if item['sender_email'] != account_email]
                if len(next_messages):
                    next_message = next_messages[0]
                    email_addresses = next_message.get('received_by_email', []) + \
                                      next_message.get('received_by_cc_email', [])
                    if email_addresses.count(email.account.email_address):
                        results['replied_with'] = next_message
            else:
                # If the message was received, we want to know if we did something with it
                next_messages = [item for item in messages_after if item['sender_email'] == account_email]
                if len(next_messages):
                    next_message = next_messages[0]
                    email_addresses = next_message.get('received_by_email', []) + \
                                      next_message.get('received_by_cc_email', [])
                    if email_addresses.count(email.sender.email_address):
                        results['replied_with'] = next_message
                    else:
                        results['forwarded_with'] = next_message

        return Response(results)


class EmailTemplateViewSet(mixins.DestroyModelMixin,
                           mixins.RetrieveModelMixin,
                           mixins.ListModelMixin,
                           GenericViewSet):
    """
    EmailTemplate API.
    """
    queryset = EmailTemplate.objects
    serializer_class = EmailTemplateSerializer
    filter_backends = (filters.OrderingFilter,)
    ordering = ('name', )


class TemplateVariableViewSet(mixins.DestroyModelMixin,
                              mixins.RetrieveModelMixin,
                              GenericViewSet):
    """
    TemplateVariable API.
    """
    queryset = TemplateVariable.objects
    serializer_class = TemplateVariableSerializer
    filter_backends = (filters.OrderingFilter,)
    ordering = ('name', )

    def list(self, request):
        queryset = TemplateVariable.objects.all().filter(Q(is_public=True) | Q(owner=request.user))
        serializer = TemplateVariableSerializer(queryset, many=True)

        default_variables = get_email_parameter_api_dict()

        template_variables = {
            'default': default_variables,
            'custom': serializer.data
        }

        return Response(template_variables)
