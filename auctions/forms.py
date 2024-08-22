from django import forms
from django.forms import modelformset_factory

from .models import Auction, Bid, Comment, Image, Category, CartItem, ProductDetail, Message, Order, ShippingAddress, \
    BillingAddress


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
    """
    A ModelForm class for adding an image to the auction
    """

    class Meta:
        model = Image
        fields = ['image']

    def __init__(self, *args, **kwargs):
        super(ImageForm, self).__init__(*args, **kwargs)
        self.visible_fields()[0].field.widget.attrs['class'] = 'form-control'


class CommentForm(forms.ModelForm):
    """
    A ModelForm class for adding a new comment to the auction
    """

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
    """
    A ModelForm class for placing a bid
    """

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


class MessageForm(forms.ModelForm):
    """
        A ModelForm class for sending a message
    """

    class Meta:
        model = Message
        fields = ['subject', 'body']
        widgets = {
            'subject': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Subject'}),
            'body': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Your message...',
                'maxlength': '1000',  # Limits the text area to 1000 characters
                'rows': 3
            }),
        }
        labels = {
            'subject': 'Subject',
            'body': 'Message',
        }


class AddToCartForm(forms.ModelForm):
    class Meta:
        model = CartItem
        fields = []  # No fields required

    def __init__(self, *args, **kwargs):
        super(AddToCartForm, self).__init__(*args, **kwargs)


class ShippingMethodForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = ['shipping_method', 'special_instructions']
        widgets = {
            'shipping_method': forms.Select(
                choices=[('standard', 'Standard Shipping'), ('expedited', 'Expedited Shipping')],
                attrs={'class': 'form-control'}),
            'special_instructions': forms.Textarea(
                attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Any special instructions...'}),
        }


class ShippingAddressForm(forms.ModelForm):
    class Meta:
        model = ShippingAddress
        fields = ['shipping_full_name', 'shipping_street_address', 'shipping_apartment_suite', 'shipping_city', 'shipping_state', 'shipping_zip_code', 'shipping_country',
                  'shipping_phone_number', 'shipping_email']
        widgets = {
            'shipping_full_name': forms.TextInput(attrs={'class': 'form-control'}),
            'shipping_street_address': forms.TextInput(attrs={'class': 'form-control'}),
            'shipping_apartment_suite': forms.TextInput(attrs={'class': 'form-control'}),
            'shipping_city': forms.TextInput(attrs={'class': 'form-control'}),
            'shipping_state': forms.TextInput(attrs={'class': 'form-control'}),
            'shipping_zip_code': forms.TextInput(attrs={'class': 'form-control'}),
            'shipping_country': forms.TextInput(attrs={'class': 'form-control'}),
            'shipping_phone_number': forms.TextInput(attrs={'class': 'form-control'}),
            'shipping_email': forms.TextInput(attrs={'class': 'form-control'}),
        }


class BillingAddressForm(forms.ModelForm):
    class Meta:
        model = BillingAddress
        fields = ['billing_full_name', 'billing_street_address', 'billing_apartment_suite', 'billing_city', 'billing_state', 'billing_zip_code', 'billing_country',
                  'billing_phone_number', 'billing_email']
        widgets = {
            'billing_full_name': forms.TextInput(attrs={'class': 'form-control'}),
            'billing_street_address': forms.TextInput(attrs={'class': 'form-control'}),
            'billing_apartment_suite': forms.TextInput(attrs={'class': 'form-control'}),
            'billing_city': forms.TextInput(attrs={'class': 'form-control'}),
            'billing_state': forms.TextInput(attrs={'class': 'form-control'}),
            'billing_zip_code': forms.TextInput(attrs={'class': 'form-control'}),
            'billing_country': forms.TextInput(attrs={'class': 'form-control'}),
            'billing_phone_number': forms.TextInput(attrs={'class': 'form-control'}),
            'billing_email': forms.TextInput(attrs={'class': 'form-control'}),
        }


class CreditCardForm(forms.Form):
    card_number = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'form-control mb-2 text-capitalize', 'placeholder': 'Credit Card Number'}))
    expiration_date = forms.CharField(widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'MM/YY'}))
    cvv = forms.CharField(widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'CVV'}))


class ACHForm(forms.Form):
    # ACH doesn't need a form, so we'll just notify the user after order confirmation.
    pass


class ZelleForm(forms.Form):
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Email for Zelle Payment'}))


class VenmoForm(forms.Form):
    venmo_username = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Venmo Username'}))


class PayPalForm(forms.Form):
    paypal_email = forms.EmailField(
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'PayPal Email'}))


class CashAppForm(forms.Form):
    cashapp_username = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'CashApp Username'}))
