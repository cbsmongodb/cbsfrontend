'use client'

import { useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";
import TodayVisits from "@/components/Plannings/TodayVisits";

export default function Page() {
  const t = useTranslations();

  return (
    <div>
      <TodayVisits />

      <ResourceTable
        title={t('pages.plannings')}
        endpoint="/api/plannings"
        fields={[
          {
            name: "planType",
            label: t('fields.planType'),
            type: "enum",
            options: ["hospital", "pharmacy", "general", "double visit"],
            optionLabels: {
              hospital: t('fields.hospitalOption'),
              pharmacy: t('fields.pharmacyOption'),
              general: t('fields.general'),
              "double visit": t('fields.doubleVisit'),
            },
          },
          { name: "period", label: t('fields.date'), type: "date" },
          {
            name: "hospital",
            label: t('fields.hospital'),
            type: "select",
            optionsEndpoint: "/api/hospitals",
          },
          {
            name: "pharmacy",
            label: t('fields.pharmacy'),
            type: "select",
            optionsEndpoint: "/api/pharmacies",
          },
          {
            name: "performer",
            label: t('fields.performer'),
            type: "select",
            optionsEndpoint: "/api/employees",
          },
          { name: "comment", label: t('fields.comment') },
          { name: "contentOfAssignment", label: t('fields.assignmentContent') },
        ]}
      />
    </div>
  );
}
