import sys
from pathlib import Path

TEXT_PATCHES = {
    "src/components/RolePermissions/RolePermissions.jsx": [
        (
            "{ label: 'მარკეტინგის შესრულება', keys: ['prescriptions', 'employee_accounts', 'employee_targets', 'employee_sales', 'doctor_sales', 'doctor_targets'] },",
            "{ label: 'მარკეტინგის შესრულება', keys: ['prescriptions', 'employee_accounts', 'employee_targets', 'employee_sales', 'doctor_targets'] },",
        ),
    ],
    "src/components/Sidebar/Sidebar.jsx": [
        (
            "  'dashboard/doctor-sales': 'doctor_sales',\n",
            "",
        ),
        (
            "      { href: 'dashboard/doctor-sales', key: 'doctorSales' },\n",
            "",
        ),
    ],
    "src/messages/ka.json": [
        ('        "doctorSales": "ექიმების გაყიდვები",\n', ""),
        ('      "doctor_sales": "ექიმების გაყიდვები",\n', ""),
    ],
    "src/messages/en.json": [
        ('        "doctorSales": "Doctor Sales",\n', ""),
        ('      "doctor_sales": "Doctor Sales",\n', ""),
    ],
    "src/messages/ru.json": [
        ('        "doctorSales": "Продажи врачей",\n', ""),
        ('      "doctor_sales": "Продажи врачей",\n', ""),
    ],
}

FILES_TO_DELETE = [
    "src/app/[locale]/dashboard/doctor-sales/page.jsx",
    "src/components/DoctorSales/DoctorSales.jsx",
    "src/components/DoctorSales/DoctorSales.css",
]

DIRS_TO_REMOVE_IF_EMPTY = [
    "src/app/[locale]/dashboard/doctor-sales",
    "src/components/DoctorSales",
]


def patch_file(rel_path, patches):
    path = Path(rel_path)
    if not path.exists():
        print(f"ERROR: {path} not found.")
        return False

    content = path.read_text(encoding="utf-8")
    changed_any = False

    for old, new in patches:
        if old in content:
            if content.count(old) > 1:
                print(f"ERROR in {path}: expected block found more than once — refusing to guess.")
                return False
            content = content.replace(old, new)
            changed_any = True

    if changed_any:
        path.write_text(content, encoding="utf-8")
        print(f"Patched {path}.")
    else:
        print(f"{path}: already patched, nothing to do.")
    return True


def main():
    if not Path("src/components/Sidebar/Sidebar.jsx").exists():
        print("ERROR: run this from the frontend repo root, e.g.:\n"
              "  cd ~/Documents/cbs-frontend/website && python3 fix_remove_doctor_sales_frontend.py")
        sys.exit(1)

    ok = True
    for rel_path, patches in TEXT_PATCHES.items():
        ok &= patch_file(rel_path, patches)

    if not ok:
        print("\nStopped before deleting any files — fix the errors above and re-run.")
        sys.exit(1)

    for rel_path in FILES_TO_DELETE:
        path = Path(rel_path)
        if path.exists():
            path.unlink()
            print(f"Deleted {path}.")
        else:
            print(f"{path}: already deleted, skipping.")

    for rel_path in DIRS_TO_REMOVE_IF_EMPTY:
        path = Path(rel_path)
        if path.exists() and path.is_dir() and not any(path.iterdir()):
            path.rmdir()
            print(f"Removed empty directory {path}.")

    import json
    for rel_path in ["src/messages/ka.json", "src/messages/en.json", "src/messages/ru.json"]:
        try:
            json.loads(Path(rel_path).read_text(encoding="utf-8"))
            print(f"{rel_path}: valid JSON.")
        except json.JSONDecodeError as e:
            print(f"ERROR: {rel_path} is no longer valid JSON: {e}")
            sys.exit(1)

    print("\nNext:")
    print("  git --no-pager status")
    print("  git --no-pager diff")


if __name__ == "__main__":
    main()
