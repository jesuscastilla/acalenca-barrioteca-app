import mysql.connector
import sys

def clean_database():
    try:
        # Conexión a la base de datos
        # Nota: Usamos 127.0.0.1 y puerto 3307 según la configuración encontrada
        conn = mysql.connector.connect(
            host="127.0.0.1",
            port=3307,
            user="acalenca",
            password="$kiesoverCairo99",
            database="acalenca"
        )
        cursor = conn.cursor()
        
        # Identificar socios de prueba
        # Normalmente en SLiMS la tabla de miembros es 'member'
        # Buscaremos los que coincidan con los nombres o IDs de prueba vistos en App.tsx
        test_barcodes = ['SOCIA-001', 'SOCIA-002', 'SOCIA-003']
        
        for barcode in test_barcodes:
            cursor.execute("DELETE FROM member WHERE member_id = %s", (barcode,))
            print(f"Eliminado socio con ID: {barcode} (si existía)")
            
        conn.commit()
        cursor.close()
        conn.close()
        print("Limpieza de base de datos completada con éxito.")
        
    except Exception as e:
        print(f"Error al conectar o limpiar la base de datos: {e}")

if __name__ == "__main__":
    clean_database()
