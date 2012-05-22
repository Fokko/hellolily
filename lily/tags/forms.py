from django import forms
from django.contrib.contenttypes.models import ContentType
from django.db.models.query_utils import Q

from lily.tags.models import Tag
from lily.utils.fields import MultipleInputAndChoiceField
from lily.utils.widgets import InputAndSelectMultiple


class TagsFormMixin(forms.ModelForm):
    """
    Mixin that adds tags to a ModelForm.
    """
    tags = MultipleInputAndChoiceField(queryset=Tag.objects.none(), required=False,
        widget=InputAndSelectMultiple(attrs={
            'class': 'input-and-choice-select',
    }))
    
    def __init__(self, *args, **kwargs):
        """
        Set the initial values for tags.
        """
        super(TagsFormMixin, self).__init__(*args, **kwargs)
        
        # Provide autocomplete suggestions and already linked tags
        self.fields['tags'].initial = self.instance.tags.all().values_list('id', flat=True)
        self.fields['tags'].queryset = Tag.objects.filter(content_type=ContentType.objects.get_for_model(self.instance.__class__))
        
    def save(self, commit=True):
        """
        Overloading super().save to create save tags and create the relationships with
        this account instance. Needs to be done here because the Tags are expected to exist
        before self.instance is saved.
        """
        # Save model instance
        instance = super(TagsFormMixin, self).save()
        
        # Save tags
        tags = self.cleaned_data.get('tags')
        for tag in tags:
            # Create relationship with Tag
            instance.tags.add(Tag(object_id=getattr(instance, instance.__class__._meta.pk.column),
                                      content_type=ContentType.objects.get_for_model(instance.__class__),
                                      name=tag))

        # Remove tags with any relationships to instance that weren't included in POST data
        tags_to_remove = Tag.objects.filter(~Q(name__in=tags), object_id=instance.pk)
        tags_to_remove.delete()

        return instance
    
    class Meta:
        fields = ('tags')