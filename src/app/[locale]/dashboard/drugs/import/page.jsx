import DrugImport from "@/components/DrugImport/DrugImport";
import ImportGate from "@/components/ImportGate/ImportGate";

export default function Page() {
  return (
    <ImportGate>
      <DrugImport />
    </ImportGate>
  );
}
