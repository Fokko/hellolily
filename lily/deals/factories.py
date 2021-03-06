import datetime

from factory.declarations import SubFactory, LazyAttribute, SelfAttribute, Iterator
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyDecimal, FuzzyChoice, FuzzyDate
from faker.factory import Factory

from lily.accounts.factories import AccountFactory
from lily.users.factories import LilyUserFactory
from lily.tenant.factories import TenantFactory

from .models import Deal, DealNextStep, DealWhyCustomer

faker = Factory.create('nl_NL')
past_date = datetime.date.today() - datetime.timedelta(days=10)
future_date = datetime.date.today() + datetime.timedelta(days=10)

NEXT_STEP_NAMES = [
    'Follow up',
    'Activation',
    'Request feedback',
    'None'
]

NEXT_STEP_DATE_INCREMENTS = [4, 2, 30, 0]


class DealNextStepFactory(DjangoModelFactory):
    tenant = SubFactory(TenantFactory)
    name = Iterator(NEXT_STEP_NAMES)
    date_increment = Iterator(NEXT_STEP_DATE_INCREMENTS)

    class Meta:
        model = DealNextStep
        django_get_or_create = ('tenant', 'name', 'date_increment')


class DealWhyCustomerFactory(DjangoModelFactory):
    name = LazyAttribute(lambda o: faker.word())

    class Meta:
        model = DealWhyCustomer


class DealFactory(DjangoModelFactory):
    tenant = SubFactory(TenantFactory)
    account = SubFactory(AccountFactory, tenant=SelfAttribute('..tenant'))
    amount_once = FuzzyDecimal(42.7)
    amount_recurring = FuzzyDecimal(42.7)
    assigned_to = SubFactory(LilyUserFactory, tenant=SelfAttribute('..tenant'))
    card_sent = FuzzyChoice([True, False])
    contacted_by = FuzzyChoice(dict(Deal.CONTACTED_BY_CHOICES).keys())
    currency = FuzzyChoice(dict(Deal.CURRENCY_CHOICES).keys())
    feedback_form_sent = FuzzyChoice([True, False])
    found_through = FuzzyChoice(dict(Deal.FOUND_THROUGH_CHOICES).keys())
    is_checked = FuzzyChoice([True, False])
    name = LazyAttribute(lambda o: faker.word())
    new_business = FuzzyChoice([True, False])
    next_step = SubFactory(DealNextStepFactory, tenant=SelfAttribute('..tenant'))
    next_step_date = FuzzyDate(past_date, future_date)
    stage = FuzzyChoice(dict(Deal.STAGE_CHOICES).keys())
    twitter_checked = FuzzyChoice([True, False])
    why_customer = SubFactory(DealWhyCustomerFactory, tenant=SelfAttribute('..tenant'))

    class Meta:
        model = Deal
