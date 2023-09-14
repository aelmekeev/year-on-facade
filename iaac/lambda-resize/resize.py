import urllib.parse
import boto3
import os
from PIL import Image

# NOTE: whenever you make changes to this file you need to run `make t-apply`

size = 1024, 1024
quality = 80

s3 = boto3.client('s3')

def lambda_handler(event, context):
    bucket = event['Records'][0]['s3']['bucket']['name']
    object_key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
    file_path = "/tmp/" + object_key.split('/')[-1]
    temp_file_path = file_path + ".original"

    with open(temp_file_path, 'wb') as f:
        print("Downloading file from S3: " + bucket + "/" + object_key + " to " + temp_file_path)
        s3.download_fileobj(bucket, object_key, f)
        file_size = str(os.fstat(f.fileno()).st_size)
        print("Downloaded file from S3. File size: " + file_size)

    with Image.open(temp_file_path) as im:
        print("Resizing image: " + temp_file_path + " to " + file_path)
        im.thumbnail(size, resample=Image.Resampling.LANCZOS)
        im.save(file_path, "JPEG", quality=quality)
        print("Resized image: " + temp_file_path + " to " + file_path)
    
    with open(file_path, "rb") as f:
        file_size = str(os.fstat(f.fileno()).st_size)
        web_object_key = object_key.replace("original", "web")
        print("Uploading file to S3: " + bucket + "/" + web_object_key + " from " + file_path + ". File size: " + file_size)
        s3.upload_fileobj(f, bucket, web_object_key)
        print("Uploaded file to S3.")
