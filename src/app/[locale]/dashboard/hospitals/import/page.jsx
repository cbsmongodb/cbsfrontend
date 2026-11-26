import HospitalImport from "@/components/HospitalImport/HospitalImport";
import ImportGate from "@/components/ImportGate/ImportGate";

export default function Page() {
  return (
    <ImportGate>
      <HospitalImport />
    </ImportGate>
  );
}
