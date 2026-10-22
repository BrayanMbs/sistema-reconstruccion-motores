import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({query:vi.fn(),release:vi.fn(),audit:vi.fn()}));
vi.mock("../src/config/database",()=>({databasePool:{connect:async()=>({query:mocks.query,release:mocks.release})}}));
vi.mock("../src/services/audit.service",()=>({AuditService:class{record=mocks.audit;}}));
import { CashSessionRepository } from "../src/repositories/cash-session.repository";
import { PaymentRepository } from "../src/repositories/payment.repository";
describe("cash session lifecycle",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.query.mockResolvedValue({rows:[],rowCount:0});});
  it("rejects duplicate opening and rolls back",async()=>{
    mocks.query.mockImplementation(async(sql:string)=>sql.includes("SELECT id, opening_amount")?{rows:[{id:"turn-1"}],rowCount:1}:{rows:[],rowCount:0});
    await expect(new CashSessionRepository().change("cashier",0,false)).rejects.toMatchObject({code:"CASH_SESSION_ALREADY_OPEN"});
    expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");expect(mocks.audit).not.toHaveBeenCalled();expect(mocks.release).toHaveBeenCalled();
  });
  it("requires explanation for a cash discrepancy",async()=>{
    mocks.query.mockImplementation(async(sql:string)=>sql.includes("SELECT id, opening_amount")?{rows:[{id:"turn-1",opening_amount:"100.00"}],rowCount:1}:sql.includes("AS cash")?{rows:[{cash:"50.00"}],rowCount:1}:{rows:[],rowCount:0});
    await expect(new CashSessionRepository().change("cashier",140,true,null,"turn-1")).rejects.toMatchObject({code:"CASH_DIFFERENCE_NOTE_REQUIRED"});
    expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("closes with exact cent totals including the initial fund",async()=>{
    mocks.query.mockImplementation(async(sql:string)=>sql.includes("SELECT id, opening_amount")?{rows:[{id:"turn-1",opening_amount:"100.10"}],rowCount:1}:sql.includes("AS cash")?{rows:[{cash:"50.20"}],rowCount:1}:{rows:[],rowCount:0});
    await expect(new CashSessionRepository().change("cashier",150.30,true,null,"turn-1")).resolves.toEqual({id:"turn-1"});
    expect(mocks.query).toHaveBeenCalledWith("COMMIT");expect(mocks.audit).toHaveBeenCalledWith("cashier","CASH_SESSION_CLOSED","CASH_SESSION","turn-1",expect.objectContaining({countedCash:150.30}),expect.anything());
  });
  it("refuses to close a different turn from a stale browser tab",async()=>{
    mocks.query.mockImplementation(async(sql:string)=>sql.includes("SELECT id, opening_amount")?{rows:[{id:"new-turn",opening_amount:0}],rowCount:1}:{rows:[],rowCount:0});
    await expect(new CashSessionRepository().change("cashier",0,true,null,"old-turn")).rejects.toMatchObject({code:"CASH_SESSION_CHANGED"});
  });
  it("prevents cashier payments when no turn is open",async()=>{
    mocks.query.mockImplementation(async(sql:string)=>sql.includes("SELECT role")?{rows:[{role:"CASHIER"}],rowCount:1}:{rows:[],rowCount:0});
    await expect(new PaymentRepository().createPaymentWithLock({workOrderId:"order",amount:10,method:"Efectivo"},"cashier",{record:mocks.audit} as never)).rejects.toMatchObject({code:"CASH_SESSION_NOT_OPEN"});
    expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");expect(mocks.query.mock.calls.some(([sql])=>String(sql).includes("INSERT INTO payments"))).toBe(false);
  });
});
