const { db } = require("../config/db.config");
const { user, address } = require("../db/schema");
const { eq } = require("drizzle-orm");
const crypto = require("crypto");

const getUserById = async (id) => {
  const [foundUser] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  if (!foundUser) return null;

  const userAddresses = await db.select().from(address).where(eq(address.userId, id));
  foundUser.addresses = userAddresses;

  delete foundUser.password;
  return foundUser;
};

const updateUserProfile = async (id, updateData) => {
  const { name, phone, username, avatar, addresses } = updateData;

  let updatePayload = {
    name,
    phone,
    username,
    avatar,
  };

  return await db.transaction(async (tx) => {
    await tx.update(user)
      .set(updatePayload)
      .where(eq(user.id, id));

    if (addresses && Array.isArray(addresses)) {
      await tx.delete(address).where(eq(address.userId, id));
      for (const addr of addresses) {
        await tx.insert(address).values({
          id: crypto.randomUUID(),
          street: addr.street,
          city: addr.city,
          state: addr.state,
          zipCode: addr.zipCode,
          country: addr.country || "Bangladesh",
          isDefault: addr.isDefault || false,
          userId: id,
        });
      }
    }

    const [updatedUser] = await tx.select().from(user).where(eq(user.id, id)).limit(1);
    if (updatedUser) {
      const userAddresses = await tx.select().from(address).where(eq(address.userId, id));
      updatedUser.addresses = userAddresses;
      delete updatedUser.password;
    }
    return updatedUser;
  });
};

module.exports = { getUserById, updateUserProfile };