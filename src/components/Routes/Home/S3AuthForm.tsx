"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const AuthFormSchema = z.object({
  awsAccessKeyID: z
    .string()
    .trim()
    .min(1, { message: "AWS Access Key ID cannot be empty" }),
  awsSecretKey: z
    .string()
    .trim()
    .min(1, { message: "AWS Secret Key cannot be empty" }),
});

export default function S3AuthForm() {
  const form = useForm<z.infer<typeof AuthFormSchema>>({
    resolver: zodResolver(AuthFormSchema),
    defaultValues: {
      awsAccessKeyID: "",
      awsSecretKey: "",
    },
  });

  async function onSubmit(values: z.infer<typeof AuthFormSchema>) {
    const S3AuthFormData = new FormData();
    S3AuthFormData.append("accessKey", values.awsAccessKeyID);
    S3AuthFormData.append("secretKey", values.awsSecretKey);

    try {
      const response = await fetch("/api/S3Auth", {
        method: "POST",
        body: S3AuthFormData,
      });

      if (!response.ok) throw new Error("Failed to post S3 Auth data");

      const result = await response.json();

      // Do something with the result
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col items-center space-y-8"
      >
        <FormField
          control={form.control}
          name="awsAccessKeyID"
          render={({ field }) => (
            <FormItem>
              <FormLabel>AWS Access Key ID</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="awsSecretKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>AWS Secret Key</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
