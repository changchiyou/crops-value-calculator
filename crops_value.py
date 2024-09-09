from PIL import ImageGrab, Image
import re
import requests

def extract_image_from_clipboard(image_path: str = 'clipboard_image.jpg') -> Image.Image:
    """
    Extracts an image from the clipboard and saves it to a file.

    Args:
        image_path (str): The file path where the image will be saved. Defaults to 'clipboard_image.jpg'.

    Returns:
        Image.Image: The image object extracted from the clipboard.

    Raises:
        ValueError: If no image data is found in the clipboard.
    """
    img = ImageGrab.grabclipboard()

    if img is None:
        raise ValueError("No image data found in clipboard")

    if img.mode == 'RGBA':
        img = img.convert('RGB')

    img.save(image_path)

    return img

def extract_text_from_image(image_path: str = 'clipboard_image.jpg', api_key: str = '091bfd2c2e88957') -> str:
    """
    Extracts text from an image using the OCR.space API.

    Args:
        image_path (str): The file path of the image to be processed. Defaults to 'clipboard_image.jpg'.
        api_key (str): The API key for the OCR.space API.

    Returns:
        str: The extracted text from the image.

    Raises:
        Exception: If the API request fails or the OCR result is not found.
    """
    payload = {
        'apikey': api_key,
        'OCREngine': 2, # better accurancy for text in image
    }
    with open(image_path, 'rb') as image_file:
        response = requests.post(
            'https://api.ocr.space/parse/image',
            files={image_path: image_file},
            data=payload
        )

    response_json = response.json()

    if 'ParsedResults' not in response_json or not response_json['ParsedResults']:
        raise Exception("Failed to extract text from image")

    parsed_text = response_json['ParsedResults'][0]['ParsedText']

    return parsed_text

def parse_numeric_text(text: str) -> list[int]:
    """
    Parses numeric values from a text string.

    Args:
        text (str): The text to be parsed.

    Returns:
        list[int]: A list of integers extracted from the text.
    """
    numeric_values = []
    for word in text.split():
        number = re.sub("[^0-9]", "", word)
        if number: # store number only if has value remaining after data washing
            numeric_values.append(int(number))

    return numeric_values

def calculate_crop_value(crops: list[int]) -> None:
    """
    Calculates the total value of crops based on predefined value ratios and prints the details.

    Args:
        crops (list[int]): A list of crop quantities.

    Raises:
        ValueError: If the number of crops does not match the expected count.
    """
    crop_value_ratios = [
        ('Wheat', 12),
        ('Corn', 15),
        ('Pumpkin', 18), 
        ('Orgourd', 21),
        ('Blue Zanthimum', 24)
    ]
    
    if len(crops) != 5:
        raise ValueError("Expected exactly 5 crop values")

    total_value = 0

    for crop_quantity, (crop_name, value_ratio) in zip(crops, crop_value_ratios):
        crop_value = crop_quantity * value_ratio
        expression = f"{crop_quantity}x{value_ratio}"
        print(f"{crop_name:20}: {expression:>13}   = {crop_value:>9}")
        total_value += crop_value

    print(f"{'='*27}\n{'Total value':20}: {total_value:>27}")

def main():
    """
    Main function to extract, parse, and calculate crop values from a clipboard image.
    """
    try:
        extract_image_from_clipboard()
        extracted_text = extract_text_from_image()
        crops = parse_numeric_text(extracted_text)
        calculate_crop_value(crops)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
