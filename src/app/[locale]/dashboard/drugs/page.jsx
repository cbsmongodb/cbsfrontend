import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  return (
    <ResourceTable
      title="მედიკამენტები"
      endpoint="/api/drugs"
      fields={[
        { name: "name", label: "სახელი" },
        {
          name: "productType",
          label: "პროდუქტის ტიპი",
          type: "select",
          optionsEndpoint: "/api/product-types",
        },
        {
          name: "profiles",
          label: "პროფილები",
          type: "multiselect-search",
          optionsEndpoint: "/api/profiles",
        },
        {
          name: "manufacturers",
          label: "მწარმოებლები",
          type: "multiselect-search",
          optionsEndpoint: "/api/manufacturers",
        },
        { name: "price", label: "ფასი", type: "number" },
        { name: "stocks", label: "მარაგი", type: "number" },
        { name: "bonus", label: "ბონუსი", type: "number" },
        { name: "monthlyTarget", label: "თვიური მიზანი", type: "number" },
        { name: "isActive", label: "აქტიური", type: "checkbox" },
      ]}
    />
  );
}
