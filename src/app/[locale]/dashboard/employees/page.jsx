import ResourceTable from "@/components/ResourceTable/ResourceTable";

export default function Page() {
  return (
    <ResourceTable
      title="თანამშრომლები"
      endpoint="/api/employees"
      fields={[
        { name: "firstName", label: "სახელი" },
        { name: "lastName", label: "გვარი", required: false },
        { name: "email", label: "ელ-ფოსტა" },
        {
          name: "password",
          label: "პაროლი (რედაქტირებისას ცარიელი = უცვლელი)",
          type: "password",
          required: false,
          hideInTable: true,
        },
        { name: "username", label: "იუზერნეიმი", required: false },
        { name: "personnelNumber", label: "პერსონალის ნომერი", required: false },
        { name: "phoneNumber", label: "ტელეფონი", required: false },
        {
          name: "employeeType",
          label: "ტიპი",
          type: "enum",
          options: ["field", "office"],
          optionLabels: { field: "საველე", office: "საოფისე" },
        },
        {
          name: "role",
          label: "როლი",
          type: "select",
          optionsEndpoint: "/api/admin/roles",
        },
        {
          name: "designation",
          label: "პოზიცია",
          type: "select",
          optionsEndpoint: "/api/admin/designations",
          required: false,
        },
        {
          name: "group",
          label: "ჯგუფი",
          type: "select",
          optionsEndpoint: "/api/admin/groups",
          required: false,
        },
        {
          name: "division",
          label: "დივიზიონი",
          type: "select",
          optionsEndpoint: "/api/divisions",
          required: false,
        },
        { name: "isActive", label: "აქტიური", type: "checkbox" },
      ]}
    />
  );
}
