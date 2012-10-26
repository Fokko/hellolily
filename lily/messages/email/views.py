# Python imports
from datetime import datetime

# Django imports
from django.views.generic.base import TemplateView
from django.views.generic.edit import CreateView, FormView

# Lily imports
from lily.messages.email.forms import CreateUpdateEmailAccountForm, CreateUpdateEmailTemplateForm, DynamicParameterForm
from lily.messages.email.models import EmailAccount, EmailTemplate


class CreateTestDataView(TemplateView):
    template_name = 'messages/email/message_row.html'


    def get_context_data(self, **kwargs):
        context = super(CreateTestDataView, self).get_context_data(**kwargs)

#        provider, created = EmailProvider.objects.get_or_create(
#            retrieve_host='imap.gmail.com',
#            retrieve_port=993,
#            send_host='smtp.gmail.com',
#            send_port=587,
#            send_use_tls=True
#        )
#
#        account, created = EmailAccount.objects.get_or_create(
#            provider=provider,
#            name='lily email',
#            email='lily@hellolily.com',
#            username='lily@hellolily.com',
#            password='0$mxsq=3ouhr)_iz710dj!*2$vkz'
#        )
#
#        email, created = EmailMessage.objects.get_or_create(
#            account=account,
#            uid=1,
#            datetime=datetime.now(),
#            from_string='Allard Stijnman <a.g.stijnman@gmail.com>',
#            from_email='a.g.stijnman@gmail.com',
#            from_name='Allard Stijnman',
#            content_type='plaintext'
#        )

        return context


class DetailEmailInboxView(TemplateView):
    template_name = 'messages/email/message_row.html'


class DetailEmailSentView(TemplateView):
    template_name = 'messages/email/message_row.html'


class DetailEmailDraftView(TemplateView):
    template_name = 'messages/email/message_row.html'


class DetailEmailArchiveView(TemplateView):
    template_name = 'messages/email/message_row.html'


class DetailEmailComposeView(TemplateView):
    template_name = 'messages/email/account_create.html'


class AddEmailAccountView(CreateView):
    template_name = 'messages/email/account_create.html'
    model = EmailAccount
    form_class = CreateUpdateEmailAccountForm


class EditEmailAccountView(TemplateView):
    template_name = 'messages/email/account_create.html'


class DetailEmailAccountView(TemplateView):
    template_name = 'messages/email/account_create.html'


class AddEmailTemplateView(CreateView):
    """
    Create a new template that can be used for sending emails.

    """
    template_name = 'messages/email/template_create_or_update.html'
    model = EmailTemplate
    form_class = CreateUpdateEmailTemplateForm


class EditEmailTemplateView(TemplateView):
    """
    Edit an existing e-mail template

    """
    template_name = 'messages/email/account_create.html'


class DetailEmailTemplateView(TemplateView):
    """
    Show the details of an existing e-mail template

    """
    template_name = 'messages/email/account_create.html'


class ParseEmailTemplateView(FormView):
    template_name = 'messages/email/template_create_or_update.html'
    form_class = DynamicParameterForm


# Testing views
create_test_data_view = CreateTestDataView.as_view()

# E-mail views
detail_email_inbox_view = DetailEmailInboxView.as_view()
detail_email_sent_view = DetailEmailSentView.as_view()
detail_email_draft_view = DetailEmailDraftView.as_view()
detail_email_archive_view = DetailEmailArchiveView.as_view()
detail_email_compose_view = DetailEmailComposeView.as_view()

# E-mail account views
add_email_account_view = AddEmailAccountView.as_view()
edit_email_account_view = EditEmailAccountView.as_view()
detail_email_account_view = DetailEmailAccountView.as_view()

# E-mail template views
add_email_template_view = AddEmailTemplateView.as_view()
edit_email_template_view = EditEmailTemplateView.as_view()
detail_email_template_view = DetailEmailTemplateView.as_view()
parse_email_template_view = ParseEmailTemplateView.as_view()