import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  return (
    <ResourceTable
      title="ექიმის კატეგორიები"
      endpoint="/api/doctor-categories"
      fields={[
        { name: "name", label: "სახელი" },
        { name: "description", label: "აღწერა" },
        { name: "isActive", label: "აქტიური" },
      ]}
    />
  );
}
