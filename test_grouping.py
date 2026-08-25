raw_positions = [
    {"instId": "XAU-USDT-SWAP", "posSide": "net", "pos": "1", "avgPx": "2600", "imr": "10"},
    {"instId": "XAU-USDT-SWAP", "posSide": "net", "pos": "2", "avgPx": "2610", "imr": "20"},
]

grouped = {}
for p in raw_positions:
    inst = p["instId"]
    side = p.get("posSide", "long").lower()
    if side == "net":
        side = "long" if float(p.get("pos", 0)) > 0 else "short"
    k = (inst, side)
    if k not in grouped:
        grouped[k] = []
    grouped[k].append(p)

formatted_positions = []
for (inst, side), items in grouped.items():
    if not items: continue
    
    # Calculate aggregated
    total_pos = sum(abs(float(i.get("pos", 0))) for i in items)
    total_m = sum(float(i.get("margin") or i.get("imr") or "0") for i in items)
    
    avg_p = sum(float(i.get("avgPx", 0)) * abs(float(i.get("pos", 0))) for i in items) / total_pos if total_pos > 0 else 0
    
    # Aggregated row
    formatted_positions.append({
        "ticket_id": f"AGG_{inst}_{side}",
        "is_aggregate": True,
        "instId": inst,
        "posSide": side,
        "pos": str(total_pos),
        "margin": str(total_m),
        "avgPx": str(avg_p),
        "children_count": len(items)
    })
    
    # Child rows (only if > 1 items, or maybe always if user wants them? 
    # If 1 item, it IS the aggregated row, no need to show child.
    if len(items) > 1:
        for idx, i in enumerate(items):
            formatted_positions.append({
                "ticket_id": i.get("posId", f"CHILD_{idx}"),
                "is_child": True,
                "parent_id": f"AGG_{inst}_{side}",
                "instId": inst,
                "posSide": side,
                "pos": str(abs(float(i.get("pos", 0)))),
                "margin": str(float(i.get("margin") or i.get("imr") or "0")),
                "avgPx": i.get("avgPx")
            })

import json
print(json.dumps(formatted_positions, indent=2))
