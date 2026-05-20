import json
import os
import math

def run():
    print("Generating high-fidelity substations from transmission lines...")
    tx_path = "data-cache/transmission_lines.geojson"
    out_path = "data-cache/substations.geojson"
    
    if not os.path.exists(tx_path):
        print(f"Error: {tx_path} not found.")
        return
        
    with open(tx_path, encoding='utf-8') as f:
        tx_data = json.load(f)
        
    features = tx_data.get("features", [])
    substations = {}
    
    for feat in features:
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})
        if not geom or geom.get("type") not in ["LineString", "MultiLineString"]:
            continue
            
        voltage = props.get("VOLTAGE") or props.get("voltage") or 115
        sub1_name = props.get("SUB_1") or "UNKNOWN"
        sub2_name = props.get("SUB_2") or "UNKNOWN"
        owner = props.get("OWNER") or "UNKNOWN"
        
        coords = []
        if geom["type"] == "LineString":
            c = geom.get("coordinates", [])
            if len(c) >= 2:
                coords = [c[0], c[-1]]
        elif geom["type"] == "MultiLineString":
            lines = geom.get("coordinates", [])
            if lines and len(lines[0]) >= 2:
                coords = [lines[0][0], lines[-1][-1]]
                
        for idx, pt in enumerate(coords):
            lon, lat = pt
            # Round coordinate slightly to deduplicate close points
            key = (round(lon, 4), round(lat, 4))
            
            sub_name = sub1_name if idx == 0 else sub2_name
            if sub_name == "UNKNOWN":
                sub_name = f"Substation {props.get('ID') or ''}"
                
            # If substation already exists, keep the highest voltage
            if key in substations:
                if voltage > substations[key]["voltage"]:
                    substations[key]["voltage"] = voltage
            else:
                substations[key] = {
                    "name": sub_name,
                    "voltage": voltage,
                    "owner": owner,
                    "coordinates": [lon, lat]
                }
                
    sub_features = []
    for key, data in substations.items():
        sub_features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": data["coordinates"]
            },
            "properties": {
                "name": data["name"],
                "voltage": data["voltage"],
                "operator": data["owner"],
                "status": "OPERATIONAL"
            }
        })
        
    out_data = {
        "type": "FeatureCollection",
        "features": sub_features
    }
    
    with open(out_path, "w", encoding='utf-8') as f:
        json.dump(out_data, f)
        
    print(f"Successfully generated {len(sub_features)} substations from transmission network!")

if __name__ == "__main__":
    run()
