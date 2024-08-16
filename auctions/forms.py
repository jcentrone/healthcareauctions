from django import forms
from django.forms import modelformset_factory

from .models import Auction, Bid, Comment, Image, Category, CartItem, ProductDetail, Message


class AuctionForm(forms.ModelForm):
    class Meta:
        model = Auction
        exclude = ['creator', 'date_created', 'buyer']
        widgets = {
            'partial_quantity': forms.NumberInput(attrs={'placeholder': 'Enter partial quantity'}),
            'production_date': forms.DateInput(attrs={'class': 'datepicker'}),
            'expiration_date': forms.DateInput(attrs={'class': 'datepicker'}),
        }

    def __init__(self, *args, **kwargs):
        super(AuctionForm, self).__init__(*args, **kwargs)
        for visible in self.visible_fields():
            visible.field.widget.attrs['class'] = 'form-control'

        # Ensure the datepicker class is preserved for date fields
        if 'production_date' in self.fields:
            self.fields['production_date'].widget.attrs['class'] += ' datepicker'
        if 'expiration_date' in self.fields:
            self.fields['expiration_date'].widget.attrs['class'] += ' datepicker'

        # Customize category field choices to show parent/child relationships
        self.fields['category'].queryset = Category.objects.all()
        self.fields['category'].choices = [
            (category.id,
             f"{category.parent.category_name} / {category.category_name}" if category.parent else f"{category.category_name}")
            for category in Category.objects.all().order_by('parent__category_name', 'category_name')
        ]


    def clean(self):
        cleaned_data = super().clean()
        auction_type = cleaned_data.get("auction_type")
        package_full = cleaned_data.get("fullPackage")

        if auction_type == "Auction":
            if not cleaned_data.get("starting_bid"):
                self.add_error('starting_bid', "Starting bid is required for auctions.")
            if not cleaned_data.get("quantity_available"):
                self.add_error('quantity_available', "Quantity is required for auctions.")

        if not package_full and not cleaned_data.get("partial_quantity"):
            self.add_error('partial_quantity', "Partial quantity is required when the package is not full.")

        return cleaned_data


class ProductDetailForm(forms.ModelForm):
    class Meta:
        model = ProductDetail
        exclude = ['auction']
        widgets = {
            # 'sku': forms.NumberInput(attrs={'placeholder': '(01)_____________'}),
            'production_date': forms.DateInput(attrs={'class': 'datepicker'}),
            'expiration_date': forms.DateInput(attrs={'class': 'datepicker'}),
        }

    def __init__(self, *args, **kwargs):
        super(ProductDetailForm, self).__init__(*args, **kwargs)
        for visible in self.visible_fields():
            visible.field.widget.attrs['class'] = 'form-control'

        if 'sku' in self.fields:
            # self.fields['sku'].required = True
            self.fields['sku'].widget.attrs['class'] = 'form-control sku-input'

        if 'production_date' in self.fields:
            self.fields['production_date'].widget.attrs['class'] += ' datepicker'
        if 'expiration_date' in self.fields:
            self.fields['expiration_date'].widget.attrs['class'] += ' datepicker'


# Define the formset for ProductDetail
ProductDetailFormSet = modelformset_factory(ProductDetail, form=ProductDetailForm, extra=1)


class ImageForm(forms.ModelForm):
    '''
    A ModelForm class for adding an image to the auction
    '''

    class Meta:
        model = Image
        fields = ['image']

    def __init__(self, *args, **kwargs):
        super(ImageForm, self).__init__(*args, **kwargs)
        self.visible_fields()[0].field.widget.attrs['class'] = 'form-control'


class CommentForm(forms.ModelForm):
    '''
    A ModelForm class for adding a new comment to the auction
    '''

    class Meta:
        model = Comment
        fields = ['comment']
        widgets = {
            'comment': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Add a comment',
            })
        }

    def __init__(self, *args, **kwargs):
        super(CommentForm, self).__init__(*args, **kwargs)
        self.fields['comment'].label = ''
        self.visible_fields()[0].field.widget.attrs['class'] = 'form-control w-75 h-75'


class BidForm(forms.ModelForm):
    '''
    A ModelForm class for placing a bid
    '''

    class Meta:
        model = Bid
        fields = ['amount']
        widgets = {
            'comment': forms.NumberInput(attrs={
                'class': 'form-control',
            })
        }

    def __init__(self, *args, **kwargs):
        super(BidForm, self).__init__(*args, **kwargs)
        for visible in self.visible_fields():
            visible.field.widget.attrs['class'] = 'form-control mt-2'


class AddToCartForm(forms.ModelForm):
    class Meta:
        model = CartItem
        fields = []  # No fields required

    def __init__(self, *args, **kwargs):
        super(AddToCartForm, self).__init__(*args, **kwargs)


class MessageForm(forms.ModelForm):
    class Meta:
        model = Message
        fields = ['subject', 'body']
        widgets = {
            'subject': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Subject'}),
            'body': forms.Textarea(attrs={'class': 'form-control', 'placeholder': 'Your message...'}),
        }
        labels = {
            'subject': 'Subject',
            'body': 'Message',
        }
