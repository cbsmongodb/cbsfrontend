import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  return (
    <ResourceTable
      title="პროდუქტის ტიპები"
      endpoint="/api/product-types"
      fields={[
        { name: "name", label: "სახელი" },
        { name: "isActive", label: "აქტიური" },
      ]}
    />
  );
}
