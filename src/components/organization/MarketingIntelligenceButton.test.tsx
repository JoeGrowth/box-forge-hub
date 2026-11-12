import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketingIntelligenceButton } from "./MarketingIntelligenceButton";

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), toast: vi.fn(), from: vi.fn(), query: { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn() } }));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate, useParams: () => ({ slug: "pengry" }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));

describe("Marketing Intelligence saved analysis access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue(mocks.query);
    for (const method of [mocks.query.select, mocks.query.eq, mocks.query.order, mocks.query.limit]) method.mockReturnValue(mocks.query);
  });
  afterEach(cleanup);

  const click = () => {
    render(<MarketingIntelligenceButton orgId="pengry-id" productId="device-id" productName="Device verification" />);
    fireEvent.click(screen.getByRole("button", { name: "Marketing Intelligence" }));
  };

  it("opens the latest organization/product analysis without creating another", async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: { id: "saved-analysis" }, error: null });
    click();
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/org/pengry/marketing/saved-analysis"));
    expect(mocks.query.eq).toHaveBeenCalledWith("organization_id", "pengry-id");
    expect(mocks.query.eq).toHaveBeenCalledWith("product_id", "device-id");
    expect(mocks.query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mocks.query.limit).toHaveBeenCalledWith(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks for offer type only when the product has no saved analysis", async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });
    click();
    await screen.findByRole("dialog");
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("does not start a new analysis when loading saved results fails", async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: new Error("Unavailable") });
    click();
    await waitFor(() => expect(mocks.toast).toHaveBeenCalled());
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});