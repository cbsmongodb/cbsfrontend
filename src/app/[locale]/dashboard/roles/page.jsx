import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  return (
    <ResourceTable
      title="როლები"
      endpoint="/api/admin/roles"
      fields={[{ name: "name", label: "სახელი" }]}
    />
  );
}
