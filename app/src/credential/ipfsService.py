import os
import httpx
from fastapi import UploadFile

PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")

async def upload_file_to_ipfs(file: UploadFile) -> str:
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    
    headers = {
        "pinata_api_key": PINATA_API_KEY,
        "pinata_secret_api_key": PINATA_SECRET_API_KEY
    }
    
    file_content = await file.read()
    
    files = {
        'file': (file.filename, file_content, file.content_type)
    }
    
    timeout = httpx.Timeout(60.0)
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(url, files=files, headers=headers)
        
        return response
        # if response.status_code == 200:
        #     data = response.json()
        #     cid = data["IpfsHash"] 
            
        #     return f"ipfs://{cid}"
        # else:
        #     raise Exception(f"Failed to upload to IPFS: {response.text}")
        