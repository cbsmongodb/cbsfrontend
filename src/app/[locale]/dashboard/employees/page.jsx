'use client'
import { useLocale, useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";
import ExcelExportButton from "@/components/ExcelExportButton/ExcelExportButton";
import { apiFetch } from "@/lib/api";
export default function Page() {
  const t = useTranslations();
  // bonus area: which bonus the rep gets on the Bonuses page
  const AREA = {
    ka: { title: 'ბონუსის ზონა', tbilisi: 'თბილისი', region: 'რეგიონი' },
    en: { title: 'Bonus area', tbilisi: 'Tbilisi', region: 'Region' },
    ru: { title: 'Зона бонуса', tbilisi: 'Тбилиси', region: 'Регион' },
  }[useLocale()] || { title: 'ბონუსის ზონა', tbilisi: 'თბილისი', region: 'რეგიონი' };
  const X = {
    ka: { division: 'დივიზიონი', status: 'სტატუსი', active: 'აქტიური', inactive: 'არააქტიური', days: ['კვ', 'ორ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'] },
    en: { division: 'Division', status: 'Status', active: 'Active', inactive: 'Inactive', days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
    ru: { division: 'Дивизион', status: 'Статус', active: 'Активный', inactive: 'Неактивный', days: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] },
  }[useLocale()] || { division: 'დივიზიონი', status: 'სტატუსი', active: 'აქტიური', inactive: 'არააქტიური', days: ['კვ', 'ორ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'] };

  // every employee this person may see (not only the page on screen)
  async function buildExcel() {
    const [list, sections] = await Promise.all([
      apiFetch('/api/employees'),
      apiFetch('/api/admin/sections').catch(() => []),
    ]);
    const people = Array.isArray(list) ? list : (list?.docs || []);
    const secs = Array.isArray(sections) ? sections : (sections?.docs || []);
    const id = (v) => String(v?._id || v || '');
    const secName = new Map(secs.map((s) => [id(s), s.name]));
    const secOfGroup = new Map();
    secs.forEach((s) => (s.groups || []).forEach((g) => secOfGroup.set(id(g), s.name)));
    const division = (e) => {
      const g = e.group;
      if (!g) return '';
      return secName.get(id(g.section)) || secOfGroup.get(id(g)) || '';
    };
    const rows = people
      .map((e) => ({ e, div: division(e), grp: e.group?.name || '' }))
      .sort((a, b) => (a.div || 'я').localeCompare(b.div || 'я') || (a.grp || 'я').localeCompare(b.grp || 'я')
        || `${a.e.firstName} ${a.e.lastName}`.localeCompare(`${b.e.firstName} ${b.e.lastName}`))
      .map(({ e, div, grp }) => [
        e.firstName || '',
        e.lastName || '',
        e.email || '',
        e.personnelNumber || '',
        e.phoneNumber || '',
        e.employeeType === 'office' ? t('fields.employeeTypeOffice') : e.employeeType === 'field' ? t('fields.employeeTypeField') : '',
        e.area === 'region' ? AREA.region : e.area === 'tbilisi' ? AREA.tbilisi : '',
        e.role?.name || '',
        div,
        grp,
        (e.workDays || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => X.days[d] ?? d).join(', '),
        e.isActive === false ? X.inactive : X.active,
      ]);
    return {
      headers: [t('fields.firstName'), t('fields.lastName'), t('fields.email'), t('fields.personnelNumber'), t('fields.phoneNumber'),
        t('fields.employeeType'), AREA.title, t('fields.role'), X.division, t('fields.group'), t('fields.workDays'), X.status],
      rows,
    };
  }

  return (
    <ResourceTable
      title={t('pages.employees')}
      headerExtra={<ExcelExportButton title={t('pages.employees')} build={buildExcel} />}
      endpoint="/api/employees"
      paginated
      pageSize={100}
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
          name: "area",
          label: AREA.title,
          type: "enum",
          options: ["tbilisi", "region"],
          optionLabels: { tbilisi: AREA.tbilisi, region: AREA.region },
          required: false,
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
        { name: "workDays", label: t('fields.workDays'), type: "weekdays", required: false },
        { name: "isActive", label: t('fields.isActive'), type: "checkbox" },
      ]}
    />
  );
}
