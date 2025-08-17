"""
Supabase Storage Integration
Handles uploading animation data to Supabase Storage
"""

import json
import logging
import os
from typing import Dict, Any, Optional
import httpx
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class SupabaseStorage:
    """Handles uploading animation data to Supabase Storage"""
    
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_ANON_KEY")
        self.bucket_name = "animation-data"
        
        if not self.supabase_url or not self.supabase_key:
            logger.warning("Supabase credentials not configured")
    
    async def upload_animation_data(
        self, 
        job_id: str, 
        animation_data: Dict[str, Any], 
        title: str,
        user_id: Optional[str] = None
    ) -> str:
        """
        Upload animation data to Supabase Storage
        
        Args:
            job_id: Unique job identifier
            animation_data: ClairKeys animation data
            title: Title of the piece
            user_id: Optional user ID for access control
            
        Returns:
            Public URL of uploaded file
        """
        try:
            if not self.supabase_url or not self.supabase_key:
                # Fallback: save to local file for testing
                return await self._save_local_fallback(job_id, animation_data, title)
            
            # Generate unique filename
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_{job_id}.json"
            
            # Convert animation data to JSON
            json_content = json.dumps(animation_data, indent=2)
            
            # Upload to Supabase Storage
            headers = {
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json",
                "apikey": self.supabase_key
            }
            
            upload_url = f"{self.supabase_url}/storage/v1/object/{self.bucket_name}/{filename}"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    upload_url,
                    content=json_content,
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code not in [200, 201]:
                    logger.error(f"Failed to upload to Supabase: {response.status_code} - {response.text}")
                    # Fallback to local storage
                    return await self._save_local_fallback(job_id, animation_data, title)
            
            # Generate public URL
            public_url = f"{self.supabase_url}/storage/v1/object/public/{self.bucket_name}/{filename}"
            
            logger.info(f"Successfully uploaded animation data: {public_url}")
            return public_url
            
        except Exception as e:
            logger.error(f"Error uploading to Supabase Storage: {str(e)}")
            # Fallback to local storage
            return await self._save_local_fallback(job_id, animation_data, title)
    
    async def _save_local_fallback(self, job_id: str, animation_data: Dict[str, Any], title: str) -> str:
        """
        Fallback method to save animation data locally
        This is useful for development and testing
        """
        try:
            # Create local storage directory
            local_storage_dir = "/tmp/results"
            os.makedirs(local_storage_dir, exist_ok=True)
            
            # Generate filename
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_{job_id}.json"
            filepath = os.path.join(local_storage_dir, filename)
            
            # Save animation data
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(animation_data, f, indent=2, ensure_ascii=False)
            
            # Return local file URL (this would need to be served by a static file server in production)
            local_url = f"file://{filepath}"
            
            logger.info(f"Saved animation data locally: {local_url}")
            return local_url
            
        except Exception as e:
            logger.error(f"Error saving local fallback: {str(e)}")
            raise
    
    async def test_connection(self) -> bool:
        """
        Test connection to Supabase Storage
        
        Returns:
            True if connection is successful, False otherwise
        """
        try:
            if not self.supabase_url or not self.supabase_key:
                logger.warning("Supabase credentials not configured")
                return False
            
            headers = {
                "Authorization": f"Bearer {self.supabase_key}",
                "apikey": self.supabase_key
            }
            
            # Test endpoint - list buckets
            test_url = f"{self.supabase_url}/storage/v1/bucket"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    test_url,
                    headers=headers,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    logger.info("Supabase Storage connection successful")
                    return True
                else:
                    logger.error(f"Supabase Storage connection failed: {response.status_code}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error testing Supabase connection: {str(e)}")
            return False