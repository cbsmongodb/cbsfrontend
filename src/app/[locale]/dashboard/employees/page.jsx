'use client'

import { useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";

export default function Page() {
  const t = useTranslations();

  return (
    <ResourceTable
      title={t('pages.employees')}
      endpoint="/api/employees"
      fields={[
        { name: "firstName", label: t('fields.firstName') },
        { name: "lastName", label: t('fields.lastName'), required: false },
        { name: "email", label: t('fields.email') },
        {
          name: "password",
          label: t('fields.passwordEdit'),
          type: "password",
          required: false,
          hideInTable: true,
        },
        { name: "personnelNumber", label: t('fields.personnelNumber'), required: false },
        { name: "phoneNumber", label: t('fields.phoneNumber'), required: false },
        {
          name: "employeeType",
          label: t('fields.employeeType'),
          type: "enum",
          options: ["field", "office"],
          optionLabels: { field: t('fields.employeeTypeField'), office: t('fields.employeeTypeOffice') },
        },
        {
          name: "role",
          label: t('fields.role'),
          type: "select",
          optionsEndpoint: "/api/admin/roles",
        },
        {
          name: "group",
          label: t('fields.group'),
          type: "select",
          optionsEndpoint: "/api/admin/groups",
          required: false,
        },
        {
          name: "division",
          label: t('fields.division'),
          type: "select",
          optionsEndpoint: "/api/divisions",
          required: false,
        },
        { name: "workDays", label: t('fields.workDays'), type: "weekdays", required: false },
        { name: "isActive", label: t('fields.isActive'), type: "checkbox" },
      ]}
    />
  );
}
