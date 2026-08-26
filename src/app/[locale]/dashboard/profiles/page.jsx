import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  return (
    <ResourceTable
      title="პროფილები"
      endpoint="/api/profiles"
      fields={[
        { name: "name", label: "სახელი" },
        { name: "isActive", label: "აქტიური" },
      ]}
    />
  );
}
