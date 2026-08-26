import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  return (
    <ResourceTable
      title="დივიზიონები"
      endpoint="/api/divisions"
      fields={[{ name: "name", label: "სახელი" }]}
    />
  );
}
