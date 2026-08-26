import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  return (
    <ResourceTable
      title="ექიმები"
      endpoint="/api/doctors"
      fields={[
        { name: "firstName", label: "სახელი" },
        { name: "lastName", label: "გვარი" },
        { name: "uniqueNumber", label: "უნიკალური ნომერი" },
        { name: "email", label: "ელ-ფოსტა" },
        { name: "phoneNumber", label: "ტელეფონი" },
        {
          name: "profile",
          label: "პროფილი",
          type: "select",
          optionsEndpoint: "/api/profiles",
        },
        {
          name: "doctorCategory",
          label: "კატეგორია",
          type: "select",
          optionsEndpoint: "/api/doctor-categories",
        },
        { name: "isBudgeted", label: "ბიუჯეტირებული", type: "checkbox" },
        { name: "isActive", label: "აქტიური", type: "checkbox" },
      ]}
    />
  );
}
