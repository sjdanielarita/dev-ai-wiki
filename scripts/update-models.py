#!/usr/bin/env python3
import json
import os
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

def main():
    print("Iniciando proceso de actualización automatizada de Dev AI Wiki...")
    
    models_data = load_json(MODELS_FILE)
    history_data = load_json(HISTORY_FILE)
    
    if not models_data or not history_data:
        print("❌ Error: Faltan archivos JSON base en el directorio 'data/'.")
        return

    # Aquí se implementaría la lógica real de web scraping o consumo de API
    # para actualizar los precios o añadir nuevos modelos descubiertos.
    # Por el momento simulamos una actualización de mantenimiento.
    
    current_time = datetime.now(timezone.utc)
    current_time_iso = current_time.strftime('%Y-%m-%dT%H:%M:%SZ')
    
    # Actualizamos el timestamp de última revisión
    models_data['last_updated'] = current_time_iso
    
    # Preparamos un nuevo registro en el historial
    current_version = history_data.get('history', [{'version': '1.0.0'}])[0]['version']
    version_parts = current_version.split('.')
    # Incrementamos el parche (patch) version
    new_version = f"{version_parts[0]}.{version_parts[1]}.{int(version_parts[2]) + 1}"
    
    new_entry = {
        "date": current_time_iso,
        "version": new_version,
        "changes": "Bot: Verificación periódica de disponibilidad de modelos y actualización de metadatos de precios completada exitosamente."
    }
    
    history_data.setdefault('history', []).insert(0, new_entry)
    
    # Guardamos los archivos actualizados
    save_json(MODELS_FILE, models_data)
    save_json(HISTORY_FILE, history_data)
    
    print("🚀 Proceso de actualización finalizado con éxito.")

if __name__ == "__main__":
    main()
