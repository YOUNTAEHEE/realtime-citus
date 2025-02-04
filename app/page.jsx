import CalculatorLayout from "./calculator/layout";
import Standard from "./calculator/standard/page";
export default function Home() {
  return (
    <div>
      <CalculatorLayout>
        <Standard />
      </CalculatorLayout>
    </div>
  );
}
