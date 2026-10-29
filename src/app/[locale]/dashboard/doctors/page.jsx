'use client'
import { useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  const t = useTranslations();
  return (
    <ResourceTable
      title={t('pages.doctors')}
      endpoint="/api/doctors"
      paginated
      pageSize={100}
      fields={[
        { name: "firstName", label: t('fields.firstName') },
        { name: "lastName", label: t('fields.lastName') },
        { name: "uniqueNumber", label: t('fields.uniqueNumber') },
        { name: "email", label: t('fields.email'), required: false },
        { name: "phoneNumber", label: t('fields.phoneNumber') },
        {
          name: "profile",
          label: t('fields.profile'),
          type: "searchable-select",
          optionsEndpoint: "/api/profiles",
        },
        {
          name: "doctorCategory",
          label: t('fields.category'),
          type: "searchable-select",
          optionsEndpoint: "/api/doctor-categories",
        },
        {
          name: "hospitalIds",
          label: t('sidebar.groups.configureMarket.hospitals'),
          type: "multiselect-search",
          optionsEndpoint: "/api/hospitals",
          optionsLabel: "name",
        },
        {
          name: "pharmacies",
          label: t('sidebar.groups.configureMarket.pharmacies'),
          type: "multiselect-search",
          optionsEndpoint: "/api/pharmacies",
          optionsLabel: "pharmacyName",
        },
        { name: "isBudgeted", label: t('fields.isBudgeted'), type: "checkbox" },
        { name: "isActive", label: t('fields.isActive'), type: "checkbox" },
      ]}
    />
  );
}
