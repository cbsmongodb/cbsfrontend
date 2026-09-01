'use client'

import { useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";

export default function Page() {
  const t = useTranslations();

  return (
    <ResourceTable
      title={t('pages.drugs')}
      endpoint="/api/drugs"
      fields={[
        { name: "name", label: t('fields.name') },
        {
          name: "productType",
          label: t('fields.productType'),
          type: "select",
          optionsEndpoint: "/api/product-types",
        },
        {
          name: "profiles",
          label: t('fields.profiles'),
          type: "multiselect-search",
          optionsEndpoint: "/api/profiles",
        },
        {
          name: "manufacturers",
          label: t('fields.manufacturers'),
          type: "multiselect-search",
          optionsEndpoint: "/api/manufacturers",
        },
        { name: "price", label: t('fields.price'), type: "number" },
        { name: "stocks", label: t('fields.stocks'), type: "number" },
        { name: "bonus", label: t('fields.bonus'), type: "number" },
        { name: "monthlyTarget", label: t('fields.monthlyTarget'), type: "number" },
        { name: "isActive", label: t('fields.isActive'), type: "checkbox" },
      ]}
    />
  );
}
