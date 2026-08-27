import ResourceTable from "@/components/ResourceTable/ResourceTable";
import TodayVisits from "@/components/Plannings/TodayVisits";

export default function Page() {
  return (
    <div>
      <TodayVisits />

      <ResourceTable
        title="ვიზიტების დაგეგმვა"
        endpoint="/api/plannings"
        fields={[
          {
            name: "planType",
            label: "ტიპი",
            type: "enum",
            options: ["hospital", "pharmacy", "general", "double visit"],
            optionLabels: {
              hospital: "ჰოსპიტალი",
              pharmacy: "აფთიაქი",
              general: "ზოგადი",
              "double visit": "ორმაგი ვიზიტი",
            },
          },
          { name: "period", label: "თარიღი", type: "date" },
          {
            name: "hospital",
            label: "ჰოსპიტალი",
            type: "select",
            optionsEndpoint: "/api/hospitals",
          },
          {
            name: "pharmacy",
            label: "აფთიაქი",
            type: "select",
            optionsEndpoint: "/api/pharmacies",
          },
          {
            name: "performer",
            label: "შემსრულებელი",
            type: "select",
            optionsEndpoint: "/api/employees",
          },
          { name: "comment", label: "კომენტარი" },
          { name: "contentOfAssignment", label: "დავალების შინაარსი" },
        ]}
      />
    </div>
  );
}
