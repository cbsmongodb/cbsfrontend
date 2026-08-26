import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  return (
    <ResourceTable
      title="სექციები"
      endpoint="/api/admin/sections"
      fields={[
        { name: "name", label: "სახელი" },
        {
          name: "region",
          label: "რეგიონი",
          type: "select",
          optionsEndpoint: "/api/admin/regions",
        },
        { name: "note", label: "შენიშვნა" },
        { name: "isActive", label: "აქტიური", type: "checkbox" },
      ]}
    />
  );
}
