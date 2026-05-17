import os
import hmac
import hashlib
import base64
import yaml
import requests
from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET", "")
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")

app = FastAPI(title="Vector AI Agent Service")

class ChatRequest(BaseModel):
    prompt: str

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), 'config.yaml')
    soul_path = os.path.join(os.path.dirname(__file__), 'SOUL.md')
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)
    
    with open(soul_path, 'r', encoding='utf-8') as f:
        soul = f.read()
        
    return config['system_prompt'], soul

def chat_with_vector(prompt: str, system_prompt: str, soul: str) -> str:
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    full_system_prompt = f"{system_prompt}\n\n{soul}"
    
    data = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": full_system_prompt},
            {"role": "user", "content": prompt}
        ]
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        if response.status_code == 200:
            return response.json()['choices'][0]['message']['content']
        else:
            return f"Error from AI Engine: {response.status_code} - {response.text}"
    except Exception as e:
        return f"AI connection error: {str(e)}"

def verify_line_signature(body: bytes, signature: str) -> bool:
    if not LINE_CHANNEL_SECRET:
        return False
    hash_obj = hmac.new(LINE_CHANNEL_SECRET.encode('utf-8'), body, hashlib.sha256).digest()
    expected_signature = base64.b64encode(hash_obj).decode('utf-8')
    return hmac.compare_digest(expected_signature, signature)

def reply_to_line(reply_token: str, text: str):
    url = "https://api.line.me/v2/bot/message/reply"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}"
    }
    payload = {
        "replyToken": reply_token,
        "messages": [
            {
                "type": "text",
                "text": text
            }
        ]
    }
    try:
        requests.post(url, headers=headers, json=payload, timeout=10)
    except Exception as e:
        print(f"Error replying to LINE: {e}")

@app.get("/")
def read_root():
    return {"status": "online", "agent": "Vector"}

@app.post("/api/chat")
async def api_chat(payload: ChatRequest):
    try:
        system_prompt, soul = load_config()
        response = chat_with_vector(payload.prompt, system_prompt, soul)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/webhook/line")
async def line_webhook(request: Request, x_line_signature: str = Header(None)):
    if not x_line_signature:
        raise HTTPException(status_code=400, detail="Missing signature header")

    body = await request.body()
    
    # Verify signature
    if not verify_line_signature(body, x_line_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        payload = await request.json()
        events = payload.get("events", [])
        
        system_prompt, soul = load_config()
        
        for event in events:
            if event.get("type") == "message":
                message = event.get("message", {})
                if message.get("type") == "text":
                    user_text = message.get("text")
                    reply_token = event.get("replyToken")
                    
                    # Call LLM
                    ai_response = chat_with_vector(user_text, system_prompt, soul)
                    
                    # Reply back on LINE
                    reply_to_line(reply_token, ai_response)

        return JSONResponse(content={"status": "success"}, status_code=200)
    except Exception as e:
        print(f"Webhook processing error: {e}")
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)
