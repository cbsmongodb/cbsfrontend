import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  return (
    <ResourceTable
      title="ჯგუფები"
      endpoint="/api/admin/groups"
      fields={[
        { name: "name", label: "სახელი" },
        {
          name: "region",
          label: "რეგიონი",
          type: "select",
          optionsEndpoint: "/api/admin/regions",
        },
        {
          name: "section",
          label: "სექცია",
          type: "select",
          optionsEndpoint: "/api/admin/sections",
        },
        { name: "note", label: "შენიშვნა" },
        { name: "isActive", label: "აქტიური", type: "checkbox" },
      ]}
    />
  );
}
