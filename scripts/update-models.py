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
    # System Prompt exigiendo el uso de búsqueda web para investigar modelos de 2026
    prompt = """
Actúa como un investigador técnico experto en Inteligencia Artificial y Desarrollo de Software en el año 2026.
Tu tarea es analizar el estado actual del mercado y devolver un JSON ESTRICTO con la información detallada de los modelos de IA especializados o útiles para desarrollo de software.

REGLAS CRÍTICAS:
1. DEBES UTILIZAR TU HERRAMIENTA DE BÚSQUEDA WEB (Google Search) integrada para investigar y verificar los lanzamientos más recientes del año 2026.
2. Investiga y verifica exhaustivamente los IDs de API reales, fechas de lanzamiento y precios actuales (en USD por 1M tokens).
3. Debes incluir exactamente las 3 versiones más recientes y relevantes orientadas a código de:
   - Anthropic Claude (ej. familias Claude 5 / Sonnet / Opus / Fable recientes).
   - OpenAI / ChatGPT (ej. familias GPT-5 / o-series recientes).
   - Google Gemini (ej. familias Gemini 3.1 / 3.5 recientes).
4. Devuelve EXCLUSIVAMENTE un objeto JSON válido, sin usar sintaxis Markdown (no uses bloques ```json).
5. Debes incorporar una sección "history_entry" documentando el proceso investigativo, mencionando fuentes, motivos y cambios detectados.

El esquema exacto que DEBES cumplir es el siguiente:
{
  "models": [
    {
      "name": "Nombre del modelo",
      "provider": "Anthropic" | "OpenAI" | "Google",
      "api_id": "id-de-api-oficial",
      "reasoning_level": "High" | "Medium" | "Low",
      "tasks": ["coding", "reasoning", "speed"],
      "strengths": ["Fuerza 1", "Fuerza 2"],
      "limitations": ["Limitación 1", "Limitación 2"],
      "cost_input_1m": 0.00,
      "cost_output_1m": 0.00
    }
  ],
  "history_entry": {
    "model_added": "Nombres de los modelos actualizados o analizados",
    "change": "Descripción de los cambios o investigación realizada en la industria",
    "reason": "Justificación de por qué estos modelos son el actual estado del arte para desarrolladores",
    "sources": ["URL o nombre de la fuente oficial encontrada en la búsqueda web", "Ej: openai.com/pricing", "Ej: anthropic.com/api"]
  }
}
"""
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    # Configuración habilitando Google Search Grounding y forzando JSON nativo
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "tools": [{"googleSearch": {}}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.2
        }
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
    
    # Bloque try-except para fallos de red o de parseo
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if 'candidates' in result and len(result['candidates']) > 0:
                content_text = result['candidates'][0]['content']['parts'][0]['text']
                
                try:
                    return json.loads(content_text)
                except json.JSONDecodeError:
                    print("❌ Error crítico: La respuesta de la IA no es un JSON válido.")
                    print("Texto devuelto:\n", content_text)
                    return None
            else:
                print("❌ Error: Respuesta vacía de Gemini API.")
                return None
                
    except urllib.error.HTTPError as e:
        print(f"❌ Error HTTP al contactar Gemini API ({e.code}): {e.reason}")
        print(e.read().decode('utf-8'))
        return None
    except urllib.error.URLError as e:
        print(f"❌ Error de red al intentar contactar la API: {e.reason}")
        return None
    except Exception as e:
        print(f"❌ Error inesperado: {str(e)}")
        return None

def main():
    print("Iniciando proceso de IA Autónoma con Búsqueda Web para actualización de Dev AI Wiki...")
    
    # 1. Leer variable de entorno
    api_key = os.environ.get("AI_API_KEY")
    if not api_key:
        print("❌ Error: La variable de entorno 'AI_API_KEY' no está definida.")
        sys.exit(1)
        
    history_data = load_json(HISTORY_FILE)
    if not history_data:
        history_data = {"history": []}
        
    print("Enviando directrices y habilitando Google Search Grounding a Gemini 2.5 Flash...")
    
    # 2, 3, 4. Petición HTTP estructurada
    ai_response = get_ai_data(api_key)
    
    if not ai_response or "models" not in ai_response or "history_entry" not in ai_response:
        print("❌ Fallo en la extracción y validación de los datos estructurales. Ejecución finalizada de forma segura.")
        sys.exit(1)
        
    current_time = datetime.now(timezone.utc)
    current_time_iso = current_time.strftime('%Y-%m-%dT%H:%M:%SZ')
    
    # 5. Fusionar datos y asegurar UTC
    final_models_data = {
        "last_updated": current_time_iso,
        "models": ai_response["models"]
    }
    
    # 7. Actualizar el archivo de histórico con los campos detallados
    ai_history = ai_response["history_entry"]
    new_entry = {
        "date": current_time_iso,
        "provider": "IA Autonomous Agent",
        "model_added": ai_history.get("model_added", "Varios"),
        "change": ai_history.get("change", "Revisión automatizada"),
        "reason": ai_history.get("reason", "Ejecución programada con acceso web"),
        "sources": ai_history.get("sources", [])
    }
    
    # Insertar al principio de la lista
    history_data.setdefault('history', []).insert(0, new_entry)
    
    # 6. Guardar cambios
    save_json(MODELS_FILE, final_models_data)
    save_json(HISTORY_FILE, history_data)
    
    print("🚀 ¡Misión cumplida! Base de datos y registro histórico actualizados por la IA (Grounding Habilitado).")

if __name__ == "__main__":
    main()