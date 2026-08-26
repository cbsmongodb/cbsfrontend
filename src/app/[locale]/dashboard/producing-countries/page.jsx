import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  return (
    <ResourceTable
      title="მწარმოებელი ქვეყნები"
      endpoint="/api/producing-countries"
      fields={[
        { name: "name", label: "სახელი" },
        { name: "isActive", label: "აქტიური" },
      ]}
    />
  );
}
