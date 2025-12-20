import re
import json

RAW_DATA = "SE÷Partido¬~SF÷Estadísticas principales¬~SD÷432¬SG÷Goles esperados (xG)¬SH÷0.32¬SI÷0.34¬~SD÷12¬SG÷Posesión¬SH÷51%¬SI÷49%¬~SD÷34¬SG÷Remates totales¬SH÷13¬SI÷8¬~SD÷13¬SG÷Remates a puerta¬SH÷4¬SI÷2¬~SD÷459¬SG÷Grandes ocasiones¬SH÷0¬SI÷1¬~SD÷16¬SG÷Córneres¬SH÷4¬SI÷2¬~SD÷342¬SG÷Pases¬SH÷87% (275/317)¬SI÷87% (271/312)¬~SD÷23¬SG÷Tarjetas amarillas¬SH÷3¬SI÷3¬~SF÷Remates¬~SD÷432¬SG÷Goles esperados (xG)¬SH÷0.32¬SI÷0.34¬~SD÷499¬SG÷xG a puerta (xGOT)¬SH÷0.21¬SI÷0.14¬~SD÷34¬SG÷Remates totales¬SH÷13¬SI÷8¬~SD÷13¬SG÷Remates a puerta¬SH÷4¬SI÷2¬~SD÷14¬SG÷Remates fuera¬SH÷8¬SI÷5¬~SD÷158¬SG÷Remates rechazados¬SH÷1¬SI÷1¬~SD÷461¬SG÷Remates dentro del área¬SH÷4¬SI÷4¬~SD÷463¬SG÷Remates fuera del área¬SH÷9¬SI÷4¬~SD÷457¬SG÷Al palo¬SH÷0¬SI÷0¬~SF÷Ataque¬~SD÷459¬SG÷Grandes ocasiones¬SH÷0¬SI÷1¬~SD÷16¬SG÷Córneres¬SH÷4¬SI÷2¬~SD÷471¬SG÷Toques en el área rival¬SH÷13¬SI÷10¬~SD÷521¬SG÷Pases entre líneas completados¬SH÷0¬SI÷1¬~SD÷17¬SG÷Fueras de juego¬SH÷1¬SI÷1¬~SD÷15¬SG÷Tiros libres¬SH÷8¬SI÷11¬~SF÷Pases¬~SD÷342¬SG÷Pases¬SH÷87% (275/317)¬SI÷87% (271/312)¬~SD÷517¬SG÷Pases largos¬SH÷67% (32/48)¬SI÷43% (16/37)¬~SD÷467¬SG÷Pases en el tercio final¬SH÷70% (61/87)¬SI÷68% (43/63)¬~SD÷433¬SG÷Centros¬SH÷40% (8/20)¬SI÷25% (2/8)¬~SD÷503¬SG÷Asistencias esperadas (xA)¬SH÷0.50¬SI÷0.42¬~SD÷18¬SG÷Saques de banda¬SH÷9¬SI÷13¬~SF÷Defensa¬~SD÷21¬SG÷Faltas¬SH÷11¬SI÷8¬~SD÷475¬SG÷Entradas¬SH÷100% (7/7)¬SI÷80% (4/5)¬~SD÷513¬SG÷Duelos ganados¬SH÷22¬SI÷24¬~SD÷479¬SG÷Despejes¬SH÷12¬SI÷21¬~SD÷434¬SG÷Intercepciones¬SH÷4¬SI÷6¬~SD÷507¬SG÷Errores conducentes a remate¬SH÷0¬SI÷0¬~SD÷509¬SG÷Errores conducentes a gol¬SH÷0¬SI÷0¬~SF÷Portería¬~SD÷19¬SG÷Paradas¬SH÷2¬SI÷4¬~SD÷501¬SG÷xGOT enfrentados¬SH÷0.14¬SI÷0.21¬~SD÷511¬SG÷Goles evitados¬SH÷0.14¬SI÷0.21¬~SE÷1er Tiempo¬~SF÷Estadísticas principales¬~SD÷432¬SG÷Goles esperados (xG)¬SH÷0.24¬SI÷0.22¬~SD÷12¬SG÷Posesión¬SH÷56%¬SI÷44%¬~SD÷34¬SG÷Remates totales¬SH÷8¬SI÷4¬~SD÷13¬SG÷Remates a puerta¬SH÷3¬SI÷1¬~SD÷459¬SG÷Grandes ocasiones¬SH÷0¬SI÷1¬~SD÷16¬SG÷Córneres¬SH÷2¬SI÷0¬~SD÷342¬SG÷Pases¬SH÷90% (210/234)¬SI÷87% (165/190)¬~SD÷23¬SG÷Tarjetas amarillas¬SH÷1¬SI÷3¬~SF÷Remates¬~SD÷432¬SG÷Goles esperados (xG)¬SH÷0.24¬SI÷0.22¬~SD÷499¬SG÷xG a puerta (xGOT)¬SH÷0.18¬SI÷0.11¬~SD÷34¬SG÷Remates totales¬SH÷8¬SI÷4¬~SD÷13¬SG÷Remates a puerta¬SH÷3¬SI÷1¬~SD÷14¬SG÷Remates fuera¬SH÷4¬SI÷3¬~SD÷158¬SG÷Remates rechazados¬SH÷1¬SI÷0¬~SD÷461¬SG÷Remates dentro del área¬SH÷1¬SI÷3¬~SD÷463¬SG÷Remates fuera del área¬SH÷7¬SI÷1¬"

def parse_flashscore_data(raw):
    # Split by the section delimiter `~SE÷` or sub-section `~SF÷` or data `~SD÷`
    # Actually, it's a stream of tokens separated by `~`.
    tokens = raw.split('~')
    
    parsed_data = {}
    current_section = "General"
    current_category = "General"
    
    for token in tokens:
        if token.startswith('SE÷'):
            current_section = token.split('÷')[1].replace('¬', '')
            parsed_data[current_section] = {}
        elif token.startswith('SF÷'):
            current_category = token.split('÷')[1].replace('¬', '')
            parsed_data[current_section][current_category] = []
        elif token.startswith('SD÷'):
            # It's a data item. It has SD, SG (Name), SH (Home), SI (Away)
            # We need to extract SG, SH, SI from this token? 
            # No, looking at the string: "~SD÷432¬SG÷Goles esperados (xG)¬SH÷0.32¬SI÷0.34¬" is ONE block?
            # Wait, the split('~') will split SD, SG, SH, SI into separate tokens if they are separated by ~?
            # Looking at raw: "...¬~SD÷432¬SG÷Goles..."
            # NO, they are NOT separated by ~, they are separated by ¬ (maybe) or just concatenated?
            # Let's check raw again: "~SD÷432¬SG÷Goles...¬SH÷0.32¬SI÷0.34¬~"
            # So one item uses `¬` as internal delimiter, but checking the string `~` is the item separator.
            # Example item: `SD÷432¬SG÷Goles esperados (xG)¬SH÷0.32¬SI÷0.34¬`
            pass

    # Better Regex approach
    # Items start with SD÷... and end before the next ~
    parts = raw.split('~')
    
    structured = {}
    current_period = "Match"
    current_group = "Main"
    
    for part in parts:
        if not part.strip(): continue
        
        if part.startswith('SE÷'):
            current_period = part.split('÷')[1].replace('¬', '')
            if current_period not in structured:
                structured[current_period] = {}
                
        elif part.startswith('SF÷'):
            current_group = part.split('÷')[1].replace('¬', '')
            if current_group not in structured[current_period]:
                structured[current_period][current_group] = []
                
        elif part.startswith('SD÷'):
            # Parse metrics
            # Format: SD÷ID¬SG÷Name¬SH÷HomeVal¬SI÷AwayVal¬
            
            # Extract fields using regex/split
            try:
                # Remove trailing ¬
                clean_part = part.rstrip('¬')
                
                # Split by ¬ (logical separator)
                fields = clean_part.split('¬')
                
                item = {}
                for f in fields:
                    if '÷' in f:
                        k, v = f.split('÷', 1)
                        if k == 'SG': item['name'] = v
                        if k == 'SH': item['home'] = v
                        if k == 'SI': item['away'] = v
                
                if item:
                    # Append to current structure
                    if current_period not in structured: structured[current_period] = {}
                    if current_group not in structured[current_period]: structured[current_period][current_group] = []
                    
                    structured[current_period][current_group].append(item)
                    
            except Exception as e:
                print(f"Error parsing part: {part} -> {e}")

    return structured

if __name__ == "__main__":
    result = parse_flashscore_data(RAW_DATA)
    print(json.dumps(result, indent=2, ensure_ascii=False))
