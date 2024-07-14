from django import forms

from .models import Auction, Bid, Comment, Image, Category, CartItem

from django import forms

class AuctionForm(forms.ModelForm):
    class Meta:
        model = Auction
        fields = ['title', 'product_name', 'description', 'category', 'starting_bid', 'reserve_bid', 'auction_duration',
                  'manufacturer', 'reference_number', 'lot_number', 'expiration_date', 'package_type',
                  'package_quantity', 'deviceSterile', 'fullPackage', 'udi', 'quantity_available', 'production_date',
                  'partial_quantity']

    def __init__(self, *args, **kwargs):
        super(AuctionForm, self).__init__(*args, **kwargs)
        for visible in self.visible_fields():
            visible.field.widget.attrs['class'] = 'form-control'

        # Customize category field choices to show parent/child relationships
        self.fields['category'].queryset = Category.objects.all()
        self.fields['category'].choices = [
            (category.id, f"{category.parent.category_name} / {category.category_name}" if category.parent else f"{category.category_name}")
            for category in Category.objects.all().order_by('parent__category_name', 'category_name')
        ]

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
        fields = ['quantity']
        widgets = {
            'quantity': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 1
            })
        }

    def __init__(self, *args, **kwargs):
        super(AddToCartForm, self).__init__(*args, **kwargs)
        for visible in self.visible_fields():
            visible.field.widget.attrs['class'] = 'form-control mt-2'
