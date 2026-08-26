import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  return (
    <ResourceTable
      title="მწარმოებლები"
      endpoint="/api/manufacturers"
      fields={[
        { name: "name", label: "სახელი" },
        {
          name: "producingCountry",
          label: "ქვეყანა",
          type: "select",
          optionsEndpoint: "/api/producing-countries",
        },
        { name: "isActive", label: "აქტიური", type: "checkbox" },
      ]}
    />
  );
}
