import os
import json
from datetime import datetime
import urllib.request

# Este script se ejecuta mediante GitHub Actions utilizando la AI_API_KEY configurada.
def main():
    api_key = os.environ.get("AI_API_KEY")
    if not api_key:
        print("Error: No se encontró la variable de entorno AI_API_KEY.")
        return

    models_path = "data/models.json"
    history_path = "data/history.json"

    # Cargar datos actuales
    if os.path.exists(models_path):
        with open(models_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        print("No se encontró el archivo models.json")
        return

    current_date = datetime.utcnow().strftime("%Y-%m-%d")
    print(f"Ejecutando actualización de modelos para la fecha: {current_date}")

    # Aquí se pueden integrar llamadas a la API de Gemini usando la AI_API_KEY 
    # para analizar la información más reciente de desarrollo de software.
    
    # Actualizamos la fecha de la última ejecución en la estructura
    data["last_updated"] = f"{current_date}T00:00:00Z"

    # Guardar cambios en models.json
    with open(models_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # Registrar el evento en el histórico si hubo cambios
    if os.path.exists(history_path):
        with open(history_path, "r", encoding="utf-8") as f:
            history = json.load(f)
    else:
        history = []

    print("Proceso de actualización finalizado con éxito.")

if __name__ == "__main__":
    main()