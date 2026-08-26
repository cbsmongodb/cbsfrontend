import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  return (
    <ResourceTable
      title="აფთიაქები"
      endpoint="/api/pharmacies"
      fields={[
        { name: "pharmacyName", label: "სახელი" },
        { name: "address", label: "მისამართი" },
        {
          name: "region",
          label: "რეგიონი",
          type: "select",
          optionsEndpoint: "/api/admin/regions",
        },
        { name: "phoneNumber", label: "ტელეფონი" },
        { name: "email", label: "ელ-ფოსტა" },
        { name: "pharmacyCategory", label: "კატეგორია" },
        { name: "isActive", label: "აქტიური", type: "checkbox" },
      ]}
    />
  );
}
