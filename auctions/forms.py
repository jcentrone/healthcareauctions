from django.contrib.auth.forms import UserChangeForm
from django.contrib.auth.forms import UserChangeForm
from django.core.exceptions import ValidationError
from django.forms import modelformset_factory, inlineformset_factory, BaseInlineFormSet
from django import forms

from .models import Auction, Bid, Comment, Image, Category, CartItem, ProductDetail, Message, Order, ShippingAddress, \
    BillingAddress, STATE_CHOICES, User, Address, ShippingAccounts


class RegistrationForm(forms.Form):
    username = forms.CharField(max_length=150, widget=forms.TextInput(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'Username',
        'autofocus': True,
        'required': True,
    }))
    email = forms.EmailField(widget=forms.EmailInput(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'Email Address',
        'required': True,
    }))
    password = forms.CharField(widget=forms.PasswordInput(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'Password',
        'required': True,
    }))
    confirmation = forms.CharField(widget=forms.PasswordInput(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'Confirm Password',
        'required': True,
    }))
    company_name = forms.CharField(max_length=255, required=False, widget=forms.TextInput(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'Company Name',
    }))
    shipping_street = forms.CharField(max_length=255, widget=forms.TextInput(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'Street',
        'required': True,
    }))
    shipping_street_2 = forms.CharField(max_length=255, required=False, widget=forms.TextInput(attrs={
        'class': 'form-control rounded',
        'placeholder': 'Street 2',
    }))
    shipping_city = forms.CharField(max_length=255, widget=forms.TextInput(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'City',
        'required': True,
    }))
    shipping_state = forms.ChoiceField(choices=STATE_CHOICES, widget=forms.Select(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'State',
        'required': True,
    }))
    shipping_zip = forms.CharField(max_length=10, widget=forms.TextInput(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'Zip Code',
        'required': True,
    }))
    shipping_country = forms.CharField(max_length=255, required=False, widget=forms.TextInput(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'Country',
    }))
    billing_street = forms.CharField(max_length=255, widget=forms.TextInput(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'Street',
        'required': True,
    }))
    billing_street_2 = forms.CharField(max_length=255, required=False, widget=forms.TextInput(attrs={
        'class': 'form-control rounded',
        'placeholder': 'Street 2',
    }))
    billing_city = forms.CharField(max_length=255, widget=forms.TextInput(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'City',
        'required': True,
    }))
    billing_state = forms.ChoiceField(choices=STATE_CHOICES, widget=forms.Select(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'State',
        'required': True,
    }))
    billing_zip = forms.CharField(max_length=10, widget=forms.TextInput(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'Zip Code',
        'required': True,
    }))
    billing_country = forms.CharField(max_length=255, required=False, widget=forms.TextInput(attrs={
        'class': 'form-control required',
        'placeholder': 'Country',
    }))
    first_name = forms.CharField(max_length=255, widget=forms.TextInput(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'First Name',
        'autofocus': True,
        'required': True,
    }))
    last_name = forms.CharField(max_length=255, widget=forms.TextInput(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'Last Name',
        'autofocus': True,
        'required': True,
    }))
    phone = forms.CharField(max_length=15, widget=forms.TextInput(attrs={
        'class': 'form-control rounded required',
        'placeholder': 'Phone',
        'autofocus': True,
        'required': True,
    }))
    company_w9 = forms.FileField(widget=forms.FileInput(attrs={
        'class': 'form-control rounded required',
        'accept': '.pdf,.doc,.docx,.jpg,.png,.jpeg',
        'required': True,
    }))
    reseller_certificate = forms.FileField(required=False, widget=forms.FileInput(attrs={
        'class': 'form-control rounded',
        'accept': '.pdf,.doc,.docx,.jpg,.png,.jpeg',
    }))



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

        # Fetch categories and order by medical specialty and category name
        categories = Category.objects.select_related('medical_specialty').all().order_by(
            'medical_specialty__description', 'category_name')

        # Customize category field choices to group by medical specialty
        self.fields['category'].choices = [
            (
                category.id,
                f"{category.medical_specialty.description if category.medical_specialty else 'Uncategorized'} / {category.category_name}"
            )
            for category in categories
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



  # Customize category field choices to show parent/child relationships
        # self.fields['category'].queryset = Category.objects.all()
        # self.fields['category'].choices = [
        #     (category.id,
        #      f"{category.parent.category_name} / {category.category_name}" if category.parent else f"{category.category_name}")
        #     for category in Category.objects.all().order_by('parent__category_name', 'category_name')
        # ]

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
        super().__init__(*args, **kwargs)


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


class MessageThreadForm(forms.ModelForm):
    reply = forms.CharField(
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'rows': 3,
            'placeholder': 'Write your reply...',
            'maxlength': '1000'
        }),
        required=False,
        label='Reply'
    )

    class Meta:
        model = Message
        fields = ['subject', 'body']
        widgets = {
            'subject': forms.TextInput(attrs={'class': 'form-control', 'readonly': 'readonly'}),
            'body': forms.Textarea(attrs={'class': 'form-control', 'readonly': 'readonly'}),
        }


class AddToCartForm(forms.ModelForm):
    quantity = forms.IntegerField(
        min_value=1,  # Minimum quantity allowed
        label="Quantity",
        widget=forms.NumberInput(attrs={'class': 'form-control mt-2 mb-3'}),
    )
    price_each = forms.DecimalField(
        min_value=.01,  # Minimum quantity allowed
        label="Price Each",
        widget=forms.NumberInput(attrs={'class': 'form-control mt-2 mb-3'}),
    )

    class Meta:
        model = CartItem
        fields = ['quantity', 'price_each']

    def __init__(self, *args, **kwargs):
        self.auction = kwargs.pop('auction', None)
        super(AddToCartForm, self).__init__(*args, **kwargs)
        if self.auction:
            self.fields['quantity'].validators.append(self.max_quantity_validator)

    def max_quantity_validator(self, value):
        if self.auction and value > self.auction.quantity_available:
            raise ValidationError(f"Cannot add more than {self.auction.quantity_available} items.")

    def save(self, commit=True):
        instance = super(AddToCartForm, self).save(commit=False)
        instance.auction = self.auction
        if commit:
            instance.save()
        return instance


class UserAddressForm(forms.ModelForm):
    class Meta:
        model = Address
        fields = [
            'street',
            'suite',
            'city',
            'state',
            'zip_code',
            'country',
            'address_type'
        ]

        widgets = {
            'shipping_full_name': forms.TextInput(attrs={'class': 'form-control required'}),
            'street': forms.TextInput(attrs={'class': 'form-control required'}),
            'suite': forms.TextInput(attrs={'class': 'form-control'}),
            'city': forms.TextInput(attrs={'class': 'form-control required'}),
            'state': forms.Select(choices=STATE_CHOICES, attrs={'class': 'form-control required'}),
            'zip_code': forms.TextInput(attrs={'class': 'form-control required'}),
            'country': forms.TextInput(attrs={'class': 'form-control'}),
            'address_type': forms.HiddenInput(),

        }


UserBillingAddressForm = UserAddressForm(prefix='billing')
UserShippingAddressForm = UserAddressForm(prefix='shipping')


class ShippingMethodForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = ['shipping_method', 'special_instructions']
        widgets = {
            'shipping_method': forms.Select(
                choices=[('standard', 'Standard Shipping: 7 - 10 Days'),
                         ('expedited', 'Expedited Shipping: 5 - 7 Days')],
                attrs={'class': 'form-control'}),
            'special_instructions': forms.Textarea(
                attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Any special instructions...'}),
        }


class ShippingAccountsForm(forms.ModelForm):
    class Meta:
        model = ShippingAccounts
        fields = ['carrier_name', 'carrier_account_number', 'use_as_default_shipping_method']
        widgets = {
            'carrier_name': forms.Select(attrs={'class': 'form-control required'}),
            'use_as_default_shipping_method': forms.Select(attrs={'class': 'form-check-input required'}),
            'carrier_account_number': forms.TextInput(
                attrs={'class': 'form-control required text-uppercase', 'placeholder': 'Enter your account number'}),
        }
        labels = {
            'carrier_name': 'Carrier Name',
            'carrier_account_number': 'Account Number',
        }
        help_texts = {
            # 'carrier_account_number': 'Optional: Enter your carrier account number if you prefer to ship using your account.',
        }

    def __init__(self, *args, **kwargs):
        super(ShippingAccountsForm, self).__init__(*args, **kwargs)
        self.fields['carrier_name'].empty_label = 'Select Carrier'

    def clean_carrier_account_number(self):
        data = self.cleaned_data.get('carrier_account_number')
        # Additional validation if needed
        return data


class ShippingAddressForm(forms.ModelForm):
    class Meta:
        model = ShippingAddress
        fields = ['shipping_full_name', 'shipping_street_address', 'shipping_apartment_suite', 'shipping_city',
                  'shipping_state', 'shipping_zip_code', 'shipping_country', 'shipping_company_name']
        widgets = {
            'shipping_full_name': forms.TextInput(attrs={'class': 'form-control required read only'}),
            'shipping_street_address': forms.TextInput(attrs={'class': 'form-control required'}),
            'shipping_company_name': forms.TextInput(attrs={'class': 'form-control'}),
            'shipping_apartment_suite': forms.TextInput(attrs={'class': 'form-control'}),
            'shipping_city': forms.TextInput(attrs={'class': 'form-control required'}),
            'shipping_state': forms.Select(choices=STATE_CHOICES, attrs={'class': 'form-control required'}),
            'shipping_zip_code': forms.TextInput(attrs={'class': 'form-control required'}),
            'shipping_country': forms.TextInput(attrs={'class': 'form-control'}),

        }


class BillingAddressForm(forms.ModelForm):
    class Meta:
        model = BillingAddress
        fields = ['billing_full_name', 'billing_street_address', 'billing_apartment_suite', 'billing_city',
                  'billing_state', 'billing_zip_code', 'billing_country', 'billing_company_name']
        widgets = {
            'billing_full_name': forms.TextInput(attrs={'class': 'form-control required'}),
            'billing_company_name': forms.TextInput(attrs={'class': 'form-control'}),
            'billing_street_address': forms.TextInput(attrs={'class': 'form-control required'}),
            'billing_apartment_suite': forms.TextInput(attrs={'class': 'form-control'}),
            'billing_city': forms.TextInput(attrs={'class': 'form-control required'}),
            'billing_state': forms.Select(choices=STATE_CHOICES, attrs={'class': 'form-control required'}),
            'billing_zip_code': forms.TextInput(attrs={'class': 'form-control required'}),
            'billing_country': forms.TextInput(attrs={'class': 'form-control'}),
        }


class CreditCardForm(forms.Form):
    card_number = forms.CharField(
        widget=forms.TextInput(
            attrs={'class': 'form-control mb-2 text-capitalize', 'placeholder': 'Credit Card Number'}))
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


class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'company_name',
            'phone_number',
            'profile_image',
            'company_logo',
            'company_w9',
            'reseller_cert',
            'tax_exempt',
        ]


class OrderNoteForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = ['order_note']
        widgets = {
            'order_note': forms.Textarea(attrs={
                'rows': 3,
                'placeholder': 'Add your note here...',
                'class': 'form-control'  # Bootstrap class
            }),
        }
        labels = {
            'order_note': 'Order Note',
        }

    def __init__(self, *args, **kwargs):
        super(OrderNoteForm, self).__init__(*args, **kwargs)
        # Adding Bootstrap class to labels if needed
        self.fields['order_note'].label = f'<label class="form-label">{self.fields["order_note"].label}</label>'


class EditProductDetailForm(forms.ModelForm):
    class Meta:
        model = ProductDetail
        fields = ['sku', 'reference_number', 'lot_number', 'production_date', 'expiration_date']
        widgets = {
            'sku': forms.TextInput(attrs={'class': 'form-control'}),
            'reference_number': forms.TextInput(attrs={'class': 'form-control'}),
            'lot_number': forms.TextInput(attrs={'class': 'form-control'}),
            'production_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'expiration_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        }


EditProductDetailFormSet = inlineformset_factory(Auction, ProductDetail, form=EditProductDetailForm, extra=0,
                                                 can_delete=True)


class EditImageForm(forms.ModelForm):
    image = forms.ImageField(
        required=False,  # Make the image field optional
        widget=forms.FileInput(attrs={'class': 'image-input d-none'})
    )

    class Meta:
        model = Image
        fields = ['image']


class BaseEditImageFormSet(BaseInlineFormSet):
    def __init__(self, *args, **kwargs):
        super(BaseEditImageFormSet, self).__init__(*args, **kwargs)
        self.total_forms = 5  # Ensure total forms is always 5
        self.extra = 0
        self.max_num = 5
        self.can_delete = True


EditImageFormSet = inlineformset_factory(
    Auction,
    Image,
    form=EditImageForm,
    extra=5,       # Display five forms
    max_num=5,     # Maximum of five images
    can_delete=True
)


class EditAuctionForm(forms.ModelForm):
    class Meta:
        model = Auction
        fields = [
            'title', 'description', 'category', 'quantity_available',
            'starting_bid', 'reserve_bid', 'buyItNowPrice', 'manufacturer',
            'auction_type', 'implantable', 'deviceSterile', 'package_type',
            'auction_duration'
        ]

        widgets = {
            'category': forms.Select(attrs={'class': 'form-control'}),
            'title': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control'}),
            # Add other fields with their respective widgets
        }
