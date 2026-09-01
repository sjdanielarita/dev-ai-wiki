#!/usr/bin/env python3
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

# Definición de rutas relativas al script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
MODELS_FILE = os.path.join(DATA_DIR, 'models.json')
HISTORY_FILE = os.path.join(DATA_DIR, 'history.json')

def load_json(filepath):
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as file:
            return json.load(file)
    return None

def save_json(filepath, data):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as file:
        json.dump(data, file, indent=2, ensure_ascii=False)
    print(f"[{datetime.now(timezone.utc).isoformat()}] ✅ Guardado correctamente: {filepath}")

def get_ai_data(api_key):
    # Prompt estricto pidiendo a la IA que estructure su investigación como JSON
    prompt = """
Actúa como un investigador técnico experto en Inteligencia Artificial y Desarrollo de Software.
Tu tarea es investigar y devolver un JSON ESTRICTO con la información más reciente y precisa de los modelos de IA especializados o útiles para desarrollo de software.

REGLAS:
1. Debes incluir exactamente las 3 versiones más recientes/relevantes de Anthropic (ej. familia Claude 3.5, 4), 3 de OpenAI (ej. familia o1, GPT-4o) y 3 de Google (ej. familia Gemini 1.5, 2.0, 3.1).
2. No uses formato Markdown, ni bloques de código (```json), debes devolver EXCLUSIVAMENTE texto JSON válido que pueda ser parseado directamente.
3. Los datos de costos ("cost_input_1m" y "cost_output_1m") deben ser flotantes realistas reflejando precio por 1 millón de tokens.

Estructura requerida:
{
  "models": [
    {
      "name": "Nombre del modelo",
      "provider": "Anthropic" | "OpenAI" | "Google",
      "api_id": "id-de-api-oficial",
      "reasoning_level": "High" | "Medium" | "Low",
      "tasks": ["coding", "reasoning", "speed"],
      "strengths": ["Fuerza principal 1", "Fuerza 2"],
      "limitations": ["Limitación 1", "Limitación 2"],
      "cost_input_1m": 0.00,
      "cost_output_1m": 0.00
    }
  ]
}
"""
    
    # Utilizando la API REST oficial de Google Gemini (v1beta o más reciente)
    # response_mime_type asegura que el modelo fuerce la salida en formato JSON
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.2 # Baja temperatura para mayor consistencia en JSON y factualidad
        }
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if 'candidates' in result and len(result['candidates']) > 0:
                content_text = result['candidates'][0]['content']['parts'][0]['text']
                
                try:
                    return json.loads(content_text)
                except json.JSONDecodeError:
                    print("❌ Error: La respuesta de Gemini no es un JSON válido.")
                    print("Contenido devuelto:", content_text)
                    return None
            else:
                print("❌ Error: Respuesta inesperada de Gemini (sin candidates).")
                return None
                
    except urllib.error.HTTPError as e:
        print(f"❌ Error HTTP de Gemini API ({e.code}): {e.reason}")
        print(e.read().decode('utf-8'))
        return None
    except Exception as e:
        print(f"❌ Error inesperado al contactar Gemini API: {str(e)}")
        return None

def main():
    print("Iniciando proceso de actualización automatizada con Gemini API...")
    
    # 1. Leer variable de entorno
    api_key = os.environ.get("AI_API_KEY")
    if not api_key:
        print("❌ Error fatal: La variable de entorno 'AI_API_KEY' no está definida.")
        print("Por favor, asegúrate de configurarla en los Secrets del repositorio.")
        sys.exit(1)
        
    history_data = load_json(HISTORY_FILE)
    if not history_data:
        history_data = {"history": []}
    
    print("Consultando a Gemini 2.5 Flash para extraer e investigar modelos actuales...")
    
    # 2 & 3 & 4. Enviar prompt, recibir y parsear JSON
    new_models_data = get_ai_data(api_key)
    
    if not new_models_data or "models" not in new_models_data:
        print("❌ Error: Falló la obtención o validación de los datos. Abortando actualización para no corromper la BD estática.")
        sys.exit(1)
        
    current_time = datetime.now(timezone.utc)
    current_time_iso = current_time.strftime('%Y-%m-%dT%H:%M:%SZ')
    
    # 5. Sobrescribir data con nueva estructura validada
    final_models_data = {
        "last_updated": current_time_iso,
        "models": new_models_data["models"]
    }
    
    # 6. Agregar entrada en el historial
    current_version = "1.0.0"
    if history_data.get('history'):
        current_version = history_data['history'][0].get('version', '1.0.0')
        
    version_parts = current_version.split('.')
    # Al ser actualización automática de base de datos, incrementamos version minor
    new_version = f"{version_parts[0]}.{int(version_parts[1]) + 1}.0"
    
    new_entry = {
        "date": current_time_iso,
        "version": new_version,
        "changes": "Actualización inteligente vía Gemini API: Descubrimiento y re-evaluación de los modelos de IA, fortalezas, y tarifas de uso."
    }
    
    history_data.setdefault('history', []).insert(0, new_entry)
    
    # Guardado seguro
    save_json(MODELS_FILE, final_models_data)
    save_json(HISTORY_FILE, history_data)
    
    print("🚀 Base de datos de modelos actualizada con éxito vía IA.")

if __name__ == "__main__":
    main()