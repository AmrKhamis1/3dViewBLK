import json

# Load JSONs
with open("api.json", "r") as f1, open("new.json", "r") as f2:
    file1 = json.load(f1)
    file2 = json.load(f2)

# Replace pos & rot_quat
for i, scan in enumerate(file1):
    if i < len(file2["scans"]):
        scan["pos"] = file2["scans"][i]["translation"]
        scan["rot_quat"] = file2["scans"][i]["rotation"]

# Save output
with open("merged.json", "w") as out:
    json.dump(file1, out, indent=2)

print("✅ Merged JSON saved as merged.json")
