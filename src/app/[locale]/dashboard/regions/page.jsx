import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  return (
    <ResourceTable
      title="რეგიონები"
      endpoint="/api/admin/regions"
      fields={[
        { name: "name", label: "სახელი" },
        { name: "reimbursementAmt", label: "ანაზღაურება/დღე", type: "number" },
        { name: "isActive", label: "აქტიური", type: "checkbox" },
      ]}
    />
  );
}
