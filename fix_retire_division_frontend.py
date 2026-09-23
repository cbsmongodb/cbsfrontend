import sys
from pathlib import Path

TEXT_PATCHES = {
    "src/app/[locale]/dashboard/employees/page.jsx": [
        (
            '        {\n'
            '          name: "division",\n'
            '          label: t(\'fields.division\'),\n'
            '          type: "select",\n'
            '          optionsEndpoint: "/api/divisions",\n'
            '          required: false,\n'
            '        },\n',
            '',
        ),
    ],
    "src/components/RolePermissions/RolePermissions.jsx": [
        (
            "{ label: 'ადმინისტრაცია', keys: ['employees', 'roles', 'designations', 'sections', 'groups', 'regions', 'leaves', 'divisions'] },",
            "{ label: 'ადმინისტრაცია', keys: ['employees', 'roles', 'designations', 'sections', 'groups', 'regions', 'leaves'] },",
        ),
    ],
    "src/components/Sidebar/Sidebar.jsx": [
        (
            "  'dashboard/divisions': 'regions',\n",
            "",
        ),
        (
            "      { href: 'dashboard/divisions', key: 'divisions' },\n",
            "",
        ),
    ],
    "src/components/DirectorDashboard/DirectorDashboard.jsx": [
        (
            "    Promise.all([\n"
            "      apiFetch('/api/doctors'),\n"
            "      apiFetch('/api/divisions'),\n"
            "      apiFetch('/api/admin/groups'),\n"
            "    ])\n"
            "      .then(([d, div, g]) => {\n"
            "        setDoctors(d)\n"
            "        setDivisions(div)\n"
            "        setGroups(g)\n"
            "      })",
            "    Promise.all([\n"
            "      apiFetch('/api/doctors'),\n"
            "      apiFetch('/api/admin/sections'),\n"
            "      apiFetch('/api/admin/groups'),\n"
            "    ])\n"
            "      .then(([d, sections, g]) => {\n"
            "        setDoctors(d)\n"
            "        // \"division\" filter here really means Section — only show the real\n"
            "        // numbered divisions (\"1 DIVIZION\" etc.), not \"Test Division\"\n"
            "        setDivisions((sections || []).filter((s) => /^\\d\\s*DIVIZION/i.test(s.name)))\n"
            "        setGroups(g)\n"
            "      })",
        ),
    ],
    "src/messages/ka.json": [
        ('        "divisions": "დივიზიონები",\n', ""),
        ('      "divisions": "დივიზიონები",\n      "budget_requests"', '      "budget_requests"'),
        ('    "divisions": "დივიზიონები",\n', ""),
        ('    "division": "დივიზიონი",\n', ""),
    ],
    "src/messages/en.json": [
        ('        "divisions": "Divisions",\n', ""),
        ('      "divisions": "Divisions",\n      "budget_requests"', '      "budget_requests"'),
        ('    "divisions": "Divisions",\n', ""),
        ('    "division": "Division",\n', ""),
    ],
    "src/messages/ru.json": [
        ('        "divisions": "Дивизионы",\n', ""),
        ('      "divisions": "Дивизионы",\n      "budget_requests"', '      "budget_requests"'),
        ('    "divisions": "Дивизионы",\n', ""),
        ('    "division": "Дивизион",\n', ""),
    ],
}

FILES_TO_DELETE = [
    "src/app/[locale]/dashboard/divisions/page.jsx",
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
              "  cd ~/Documents/cbs-frontend/website && python3 fix_retire_division_frontend.py")
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
