import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  return (
    <ResourceTable
      title="პოზიციები"
      endpoint="/api/admin/designations"
      fields={[
        { name: "position", label: "პოზიცია" },
        { name: "isActive", label: "აქტიური" },
      ]}
    />
  );
}
