'use client'

import { useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";

export default function Page() {
  const t = useTranslations();

  return (
    <ResourceTable
      title={t('pages.doctors')}
      endpoint="/api/doctors"
      fields={[
        { name: "firstName", label: t('fields.firstName') },
        { name: "lastName", label: t('fields.lastName') },
        { name: "uniqueNumber", label: t('fields.uniqueNumber') },
        { name: "email", label: t('fields.email') },
        { name: "phoneNumber", label: t('fields.phoneNumber') },
        {
          name: "profile",
          label: t('fields.profile'),
          type: "select",
          optionsEndpoint: "/api/profiles",
        },
        {
          name: "doctorCategory",
          label: t('fields.category'),
          type: "select",
          optionsEndpoint: "/api/doctor-categories",
        },
        { name: "isBudgeted", label: t('fields.isBudgeted'), type: "checkbox" },
        { name: "isActive", label: t('fields.isActive'), type: "checkbox" },
      ]}
    />
  );
}
