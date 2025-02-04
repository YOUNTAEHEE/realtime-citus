import Nav from "../../component/nav/Nav";

export default function CalculatorLayout({ children }) {
  return (
    <div>
      <Nav />

      <div>{children}</div>
    </div>
  );
}
