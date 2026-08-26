import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  return (
    <ResourceTable
      title="ჰოსპიტლები"
      endpoint="/api/hospitals"
      fields={[
        { name: "name", label: "სახელი" },
        { name: "address", label: "მისამართი" },
        {
          name: "region",
          label: "რეგიონი",
          type: "select",
          optionsEndpoint: "/api/admin/regions",
        },
        { name: "phoneNumber", label: "ტელეფონი" },
        { name: "email", label: "ელ-ფოსტა" },
        { name: "lat", label: "გრძედი (lat)", type: "number" },
        { name: "lng", label: "განედი (lng)", type: "number" },
        { name: "isActive", label: "აქტიური", type: "checkbox" },
      ]}
    />
  );
}
